// Background removal + face box using Apple Vision (macOS 14+).
// usage: swift cutout.swift <in> <out.png>
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
guard let ci = CIImage(contentsOf: inURL) else { fatalError("bad image") }
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
let face = VNDetectFaceRectanglesRequest()
try handler.perform([req, face])
guard let obs = req.results?.first else { fatalError("no mask") }
let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
let outCI = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
try ctx.writePNGRepresentation(of: outCI, to: outURL, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
if let f = face.results?.first {
  let b = f.boundingBox
  print(String(format: "{\"x\":%.4f,\"y\":%.4f,\"w\":%.4f,\"h\":%.4f}", b.origin.x, b.origin.y, b.size.width, b.size.height))
}
