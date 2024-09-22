# Juego de Letras

## Descripción
Este proyecto es un juego de mecanografía interactivo donde las letras caen desde la parte superior de la pantalla y el jugador debe presionar las teclas correspondientes antes de que lleguen al fondo.

## Estructura del Proyecto
```
├── index.html
├── main.css
├── src
│   ├── main.js
│   ├── application
│   │   ├── GameManager.js
│   │   ├── ScoreManager.js
│   │   └── TimerManager.js
│   ├── domain
│   │   └── Letter.js
│   └── infrastructure
│       ├── controllers
│       │   └── GameController.js
│       ├── presenters
│       │   └── GamePresenter.js
│       └── workers
│           ├── TimerWorker.js
│           ├── LetterGeneratorWorker.js
│           └── ScoreWorker.js
```

## Flujo de la Aplicación

1. **Inicialización**: Al cargar la página, `main.js` inicializa todos los componentes necesarios.

2. **Selección de Dificultad**: El jugador selecciona una dificultad y presiona "Jugar".

3. **Inicio del Juego**: `GameController` inicia el juego, mostrando una cuenta regresiva.

4. **Bucle del Juego**: Las letras caen, el jugador las elimina presionando las teclas correspondientes.

5. **Fin del Juego**: El juego termina cuando se acaba el tiempo.

## Componentes Principales

### GameManager
Gestiona la lógica principal del juego.

```javascript
class GameManager {
  constructor(gameArea, scoreManager, timerManager, letterGeneratorWorker) {
    // ...
  }

  startGame() {
    this.isPlaying = true;
    this.clearLetters();
    this.usedLetters.clear();
    this.scoreManager.resetScore();
    this.timerManager.startTimer();
    this.letterGeneratorWorker.postMessage({ command: "start" });
  }

  // ...
}
```

### ScoreManager
Gestiona la puntuación del juego utilizando un Web Worker.

```javascript
class ScoreManager {
  constructor(scoreElement) {
    this.scoreElement = scoreElement;
    this.scoreWorker = new Worker("/src/infrastructure/workers/ScoreWorker.js");
    this.setupWorkerListener();
  }

  updateScore(points) {
    this.scoreWorker.postMessage({ command: "updateScore", points: points });
  }

  // ...
}
```

### TimerManager
Maneja el temporizador del juego utilizando un Web Worker.

```javascript
class TimerManager {
  constructor(timerElement, onTimerEnd) {
    this.timerElement = timerElement;
    this.onTimerEnd = onTimerEnd;
    this.timerWorker = new Worker("/src/infrastructure/workers/TimerWorker.js");
    this.setupWorkerListener();
    this.initialTime = 60;
  }

  startTimer() {
    this.timerWorker.postMessage({
      command: "start",
      initialTime: this.initialTime,
    });
  }

  // ...
}
```

### GameController
Controla el flujo del juego, conectando el GameManager con el GamePresenter.

```javascript
class GameController {
  constructor(gameManager, gamePresenter) {
    this.gameManager = gameManager;
    this.gamePresenter = gamePresenter;
  }

  startGame() {
    this.gamePresenter.showGameView();
    this.gamePresenter.startCountdown(() => {
      this.gameManager.startGame();
      this.beginGameLoop();
    });
  }

  // ...
}
```

### GamePresenter
Maneja la presentación del juego en la interfaz de usuario.

```javascript
class GamePresenter {
  constructor(menuView, gameView, countdownElement, gameArea) {
    // ...
  }

  updateGameArea(letters) {
    this.clearGameArea();
    letters.forEach((letter) => {
      const letterElement = document.createElement("div");
      letterElement.className = "letter";
      letterElement.textContent = letter.character;
      letterElement.style.left = `${letter.x}px`;
      letterElement.style.top = `${letter.y}px`;
      letterElement.style.backgroundColor = letter.color;
      this.gameArea.appendChild(letterElement);
    });
  }

  // ...
}
```

## Web Workers

El juego utiliza tres Web Workers para mejorar el rendimiento y la responsividad:

1. **TimerWorker**: Maneja el temporizador del juego.
2. **LetterGeneratorWorker**: Genera nuevas letras para el juego.
3. **ScoreWorker**: Maneja la lógica de puntuación.

Ejemplo de TimerWorker:

```javascript
let interval;
let timeRemaining = 60;

self.onmessage = function (e) {
  switch (e.data.command) {
    case "start":
      timeRemaining = e.data.initialTime || 60;
      startTimer();
      break;
    // ...
  }
};

function startTimer() {
  if (!interval) {
    interval = setInterval(() => {
      timeRemaining--;
      self.postMessage({ timeRemaining });

      if (timeRemaining <= 0) {
        stopTimer();
      }
    }, 1000);
  }
}

// ...
```

## Características Clave

1. **Programación Concurrente**: Utiliza Web Workers para manejar tareas en segundo plano.
2. **Separación de Responsabilidades**: Utiliza un patrón similar a MVC para separar la lógica del juego, la presentación y el control.
3. **Interfaz Responsiva**: Diseño atractivo y responsivo utilizando CSS moderno.
4. **Dificultad Ajustable**: Permite al jugador seleccionar entre diferentes niveles de dificultad.

## Cómo Jugar

1. Abre `index.html` en tu navegador.
2. Selecciona un nivel de dificultad.
3. Presiona "Jugar" para comenzar.
4. Presiona las teclas correspondientes a las letras que caen antes de que lleguen al fondo.
5. ¡Obtén la mayor puntuación posible antes de que se acabe el tiempo!

## Tecnologías Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Web Workers API

Este juego demuestra el uso de tecnologías web modernas para crear una experiencia de juego interactiva y responsiva.
