import * as ort from "onnxruntime-node"
import { modelFetcher } from "./model-fetcher"
import {
  utils,
  PlatformAgnosticNonRealTimeVAD,
  FrameProcessor,
  FrameProcessorOptions,
  Message,
  NonRealTimeVADOptions,
} from "./_common"

class NonRealTimeVAD extends PlatformAgnosticNonRealTimeVAD {
  static async new(
    options: Partial<NonRealTimeVADOptions> = {}
  ): Promise<NonRealTimeVAD> {
    return await this._new(modelFetcher, ort, options)
  }
}

export { utils, FrameProcessor, Message, NonRealTimeVAD }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
export { RealTimeVAD } from "./real-time-vad"
