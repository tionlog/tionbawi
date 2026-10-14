# Asset prompts

Assets were produced with the built-in imagegen tool and then copied into `public/`.

## chef-stage.png

Use case: precise-object-edit. Edit target: this exact chef image, used as the stationary background of a layered web animation. Keep exactly the same square composition, camera, fluffy felt white chef coat, red neck scarf, hat, soft studio lighting, table and body proportions. Remove all three silver cloches AND their plates completely, reconstructing the white coat and tabletop naturally behind them. Keep hands approximately in their existing positions, now relaxed with curved fingers hovering above the empty tabletop ready to shuffle. Fill the hollow neck opening with a short natural peach toy-like neck that extends upward to y=360, leaving the rest of face region blank for a live camera overlay. No bread, no replacement props, no text. Preserve the fluffy felt texture. Output same square image with a seamless very light gray studio background, no borders.

## chef-stage-face.png

Use case: precise-object-edit. Edit target: supplied square 2.5D plush chef stage image. Primary request: Fill only the currently blank pale-gray rectangular face gap between the chef hat and short neck with a natural cute toy-like head and face, aligned perfectly to the existing neck and under the chef hat. Make the cheeks peach, simple friendly eyes and a tiny smile, 2.5D Nintendo-like soft clay/felt material with gentle studio shading. Preserve the original chef hat, fluffy white chef uniform, red scarf, both hands, empty tabletop, camera, lighting, colors, positioning and square framing exactly. No text, no extra props, no cloches, no bread. The face should connect seamlessly to the existing peach neck and be completely hidden by the hat at its top. Avoid any visible rectangle or blank seam around the face.

## salt-bread.png

Extract this EXACT bread, not a new bread. Background-extraction for web sprite. Keep the original source pixels of the bread as closely as possible including the small white marking. Remove the entire white background. Output a clean PNG with actual fully transparent alpha=0 outside the bread, absolutely NO glow, NO shadow, NO black or brown backdrop, NO haze. Single bread only, fully visible, centered with 5% transparent padding. Maintain the smooth toy-like glossy material and original shape. This is background removal, not a photorealistic redraw.

## success-stage.png

Use case: precise-object-edit. Input image is the user's exact success.png for a web game's victory scene. Preserve the exact canvas size and every existing pixel of the chef's tall white hat, white chef uniform, exuberant full-body stance, silver serving tray, hands, legs, and white background as closely as possible. Change only the face area between the hat brim and the coat collar: remove the original cartoon man's eyes, nose, mouth, moustache, eyebrows and hair, leaving a clean featureless warm skin-toned head and short neck with soft 3D shading in the same shape and position. The head must remain attached naturally to the collar and under the hat. Do not move, redraw, crop, or add anything else. No food, no text, no logos. This image will receive a live user's face over the blank head.

## lucky-letter.png

Built-in image_gen, background-extraction, transparent PNG.

Use case: background-extraction. Edit target: the user's latest attached pixel-art envelope image (white envelope, thick black stepped border, gray pixel shadows, blue square stamp at upper right). Remove ONLY the white background outside the envelope silhouette, make it genuinely transparent. Preserve the opaque white paper inside the envelope, blue stamp, exact black pixel outlines and gray pixel shading. Do not redesign, smooth, rotate, add text, or add objects. Center the complete envelope with only small transparent margins; tightly frame the envelope so it fills roughly 90% of image width. Save a transparent PNG for a game UI asset.
