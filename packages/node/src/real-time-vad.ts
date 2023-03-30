import { Silero, SpeechProbabilities } from "./_common/models"
import * as ort from "onnxruntime-node"
import { modelFetcher } from "./model-fetcher"
import {
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorOptions,
} from "./_common/frame-processor"
import { Resampler } from "./_common/resampler"
import { Message } from "./_common/messages"
import { log } from "./_common/logging"

interface RealTimeVADCallbacks {
  /** Callback to run after each frame. The size (number of samples) of a frame is given by `frameSamples`. */
  onFrameProcessed: (probabilities: SpeechProbabilities) => any

  /** Callback to run if speech start was detected but `onSpeechEnd` will not be run because the
   * audio segment is smaller than `minSpeechFrames`.
   */
  onVADMisfire: () => any

  /** Callback to run when speech start is detected */
  onSpeechStart: () => any

  /**
   * Callback to run when speech end is detected.
   * Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000.
   * This will not run if the audio segment is smaller than `minSpeechFrames`.
   */
  onSpeechEnd: (audio: Float32Array) => any
}

interface RealTimeVADOptions
  extends FrameProcessorOptions,
    RealTimeVADCallbacks {}

const defaultRealTimeVADOptions = {
  onFrameProcessed: (probabilities) => {},
  onVADMisfire: () => {
    log.debug("VAD misfire")
  },
  onSpeechStart: () => {
    log.debug("Detected speech start")
  },
  onSpeechEnd: () => {
    log.debug("Detected speech end")
  },
  ...defaultFrameProcessorOptions,
}
function validateOptions(options: RealTimeVADOptions) {}

export class RealTimeVAD {
  // @ts-ignore
  frameProcessor: FrameProcessor

  // @ts-ignore
  resampler: Resampler

  static async new(
    inputSampleRate: number,
    options: Partial<RealTimeVADOptions> = {}
  ) {
    const vad = new RealTimeVAD(inputSampleRate, {
      ...defaultRealTimeVADOptions,
      ...options,
    })
    await vad.init()
    return vad
  }

  constructor(
    public inputSampleRate: number,
    public options: RealTimeVADOptions
  ) {
    validateOptions(options)
  }

  init = async () => {
    const model = await Silero.new(ort, modelFetcher)

    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
      frameSamples: this.options.frameSamples,
      positiveSpeechThreshold: this.options.positiveSpeechThreshold,
      negativeSpeechThreshold: this.options.negativeSpeechThreshold,
      redemptionFrames: this.options.redemptionFrames,
      preSpeechPadFrames: this.options.preSpeechPadFrames,
      minSpeechFrames: this.options.minSpeechFrames,
    })
    this.frameProcessor.resume()

    this.resampler = new Resampler({
      nativeSampleRate: this.inputSampleRate,
      targetSampleRate: 16000,
      targetFrameSize: this.options.frameSamples,
    })
  }

  processAudio = async (audio: Float32Array) => {
    const frames = this.resampler.process(audio)
    for (const frame of frames) {
      const { probs, msg, audio } = await this.frameProcessor.process(frame)
      if (probs !== undefined) {
        this.options.onFrameProcessed(probs)
      }
      switch (msg) {
        case Message.SpeechStart:
          this.options.onSpeechStart()
          break

        case Message.VADMisfire:
          this.options.onVADMisfire()
          break

        case Message.SpeechEnd:
          // @ts-ignore
          this.options.onSpeechEnd(audio)
          break

        default:
          break
      }
    }
  }
}
