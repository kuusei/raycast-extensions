/**
 * @file operations/flipOperation.ts
 *
 * @summary Image flipping operation with support for basic image formats, SVGs, WebP, and PDFs.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:16:12
 * Last modified  : 2024-06-26 21:37:46
 */

import { execSync } from "child_process";
import path from "path";

import { Direction } from "../utilities/enums";
import {
  execSIPSCommandOnAVIF,
  execSIPSCommandOnSVG,
  execSIPSCommandOnWebP,
  flipPDF,
  getDestinationPaths,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";

/**
 * Flips images vertically or horizontally, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to flip.
 * @param direction The direction in which to flip the images.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function flip(sourcePaths: string[], direction: Direction) {
  const pathStrings = '"' + sourcePaths.join('" "') + '"';
  const newPaths = await getDestinationPaths(sourcePaths);
  const directionString = direction == Direction.HORIZONTAL ? "horizontal" : "vertical";

  if (
    pathStrings.toLowerCase().includes("webp") ||
    pathStrings.toLowerCase().includes("svg") ||
    pathStrings.toLowerCase().includes("pdf") ||
    pathStrings.toLowerCase().includes("avif")
  ) {
    // Special types present -- Handle each image individually
    const resultPaths = [];
    for (const imgPath of sourcePaths) {
      if (imgPath.toLowerCase().endsWith("webp")) {
        // Convert to PNG, flip and restore to WebP
        resultPaths.push(await execSIPSCommandOnWebP(`sips --flip ${directionString}`, imgPath));
      } else if (imgPath.toLowerCase().endsWith("svg")) {
        // Convert to PNG, flip, and restore to SVG
        resultPaths.push(await execSIPSCommandOnSVG(`sips --flip ${directionString}`, imgPath));
      } else if (imgPath.toLowerCase().endsWith("pdf")) {
        // Flip each page of PDF
        resultPaths.push(await flipPDF(imgPath, direction));
      } else if (imgPath.toLowerCase().endsWith("avif")) {
        // Convert to PNG, flip, and restore to AVIF
        resultPaths.push(await execSIPSCommandOnAVIF(`sips --flip ${directionString}`, imgPath));
      } else {
        // Image is not a special format, so just flip it using SIPS
        const newPath = newPaths[sourcePaths.indexOf(imgPath)];
        resultPaths.push(newPath);
        execSync(`sips --flip ${directionString} -o "${newPath}" "${imgPath}"`);
      }
    }
    await moveImageResultsToFinalDestination(resultPaths);
    return resultPaths;
  } else {
    // No special types -- Flip all images at once
    const outputLocation = newPaths.length == 1 ? newPaths[0] : path.join(path.dirname(newPaths[0]), "flipped");

    if (newPaths.length > 1) execSync(`mkdir -p "${outputLocation}"`);

    execSync(`sips --flip ${directionString} -o "${outputLocation}" ${pathStrings}`);
    await moveImageResultsToFinalDestination(newPaths);
  }
  return newPaths;
}
