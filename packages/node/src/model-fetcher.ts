import * as fs from "fs/promises"

const modelPath = `${__dirname}/silero_vad.onnx`

export const modelFetcher = async (): Promise<ArrayBuffer> => {
  const contents = await fs.readFile(modelPath)
  return contents.buffer
}
