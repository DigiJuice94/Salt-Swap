# The Trenches V1.10.45 — Simple Entrance

This update keeps the V1.10.44 scanner and social functionality intact while replacing the entrance experience with a simpler cinematic scene.

## Entrance update

- One sheep is the only focal character.
- One trench fills the scene.
- Background smoke, distant blast flashes, shell streaks, and debris stay subtle.
- The entrance uses text only—no separate sheep logo or crowded character lineup.
- Clicking **ENTER THE TRENCHES** reveals the existing scanner with a short transition.
- Desktop, mobile, keyboard focus, and reduced-motion behavior are included.

## Files

- `index.html` — existing V1.10.44 app plus the entrance markup and transition logic.
- `styles.css` — existing styles plus the V1.10.45 entrance design and animation.
- `assets/trenches-entrance-sheep.png` — the established single-sheep trench artwork.

The stylesheet and entrance image now use folder-relative paths so the scene works when opened directly, previewed from a subfolder, or deployed as the site root.

The entrance scene, atmosphere, shade, and text also use explicit positive stacking layers so the sheep artwork remains visible above the entrance background.
