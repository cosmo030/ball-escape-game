# Ball Escape Game

![Game Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

**Ball Escape** is an addictive, browser-based physics arcade game built with HTML5 Canvas and vanilla JavaScript. Guide a bouncing ball through rotating concentric circles, timing your jumps perfectly to escape through the gaps.

## 🎮 How to Play

The goal is simple: **Escape the rings with the fewest clicks possible.**

1.  **Start:** Click anywhere on the screen to begin.
2.  **Move:** The ball bounces automatically. Click to "Kick" (jump) the ball upwards.
3.  **Escape:** Pass through the gaps in the rotating rings to break them.
4.  **Don't Stop:** If the ball stops moving for too long, you lose!
5.  **Win:** Break all the rings to escape.

> **Pro Tip:** This is a "Golf-style" game. A lower score (fewer clicks) is better!

## ✨ Features

* **Physics Engine:** Custom-built physics with gravity, friction, and realistic collision constraints.
* **Procedural Difficulty:** Rings get faster and gaps get larger as you progress outward.
* **"Juicy" Game Feel:**
    * Screen shake on impact.
    * Particle explosions when rings shatter.
    * Dynamic color changes.
* **Audio System:** Synthesized sound effects (no external assets required) using the Web Audio API.
* **Local High Score:** Saves your best "efficiency run" (lowest clicks) to your browser's local storage.
* **Responsive:** Works on desktop and mobile browsers.

## 🚀 Quick Start

You can play the game directly in your browser without installing anything.

### Option 1: Live Demo
[**Play the Game Here**](https://your-username.github.io/ball-escape-game/)
*(Replace this link with your actual GitHub Pages URL)*

### Option 2: Run Locally
1.  Clone this repository:
    ```bash
    git clone [https://github.com/your-username/ball-escape-game.git](https://github.com/your-username/ball-escape-game.git)
    ```
2.  Navigate to the folder.
3.  Open `index.html` in any modern web browser.

## 🛠️ Project Structure

The project is lightweight and requires no build tools.

```text
ball-escape-game/
├── index.html      # Main game structure and UI
├── style.css       # Styling for HUD, buttons, and layout
├── script.js       # Game logic, physics engine, and audio synthesis
└── README.md       # Project documentation
