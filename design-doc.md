Pocket Pinball: One-Page Design Doc
A tiny browser pinball game, built with plain JavaScript on an HTML canvas.
Pitch
Keep the ball alive and rack up points. One table, one ball at a time, and three levels to choose from. Easy to learn in ten seconds, hard to put down.
The one mechanic
Flipping. The player taps left or right to swing the flippers and launch the ball back up the table. Everything else in the game exists to give that action something to hit.
The screen
A portrait table, about 480 × 800 pixels, scaled to fit the window. A title menu lets the player choose one of three levels.
• Top: score and balls remaining.
• Level 1: three round bumpers in a triangle, plus two angled walls that guide the ball.
• Level 2: five bumpers, with two more below the first group and the raised side guides.
• Level 3: three bumpers in an arc, two more below side-mounted flippers, and four flippers (two on each side). The upper flippers replace the angled side guides.
• Bottom: two flippers with a gap between them (the drain). A ball falling through the gap is lost.
• Right edge: a plunger lane where the ball starts.
Controls
Input
Action
Left arrow or Z, or tap left half of screen
Left flipper
Right arrow or M, or tap right half of screen
Right flipper
1 / 2 / 3, or tap a level on the title or game-over screen
Choose a level / play again
Space, or tap the table
Launch the ball
Score and rules
• Each bumper hit: 100 points.
• Hitting every bumper on the current level lights a bonus: the next hit is worth 500 points.
• The player has 3 balls. When the third is lost, the game ends.
• The best score is saved in the browser and shown on the game over screen.
Look and sound
Flat, bright shapes on a dark table: no sprites needed for version one. Use 4 free sound effects (flipper, bumper, launch, drain) from jsfxr. A small screen shake on bumper hits adds punch.
Tech
A canvas game with a game loop, served as a static site on GitHub Pages. Support mobile Safari on iPhone and Chrome on Android using the responsive canvas and touch controls. Use circle and line collisions with simple gravity, and cap the ball's speed to keep it from tunneling through walls.
Not now
These wait until version one is playable: multiball, ramps, tilt, a second table, music, online leaderboards, and a polished art style.
Build order
1.  Canvas, game loop, and a ball that falls with gravity (about 2 hours).
2.  Walls and bounce physics (about 3 hours).
3.  Flippers with keyboard and touch controls (about 5 hours).
4.  Bumpers and scoring (about 3 hours).
5.  Balls, game over, and best score (about 3 hours).
6.  Sound and polish (about 4 hours).
7.  Playtest with two friends, fix the top issues, and publish (about 4 hours).
Total: about 24 hours of focused work. This is a bare-bones first version, so the first-timer buffer in the estimator would bring it closer to 30.
Done means
A stranger can open the link, play three balls without instructions, and want to beat their score.