# AGENTS.md

## Propósito

Este archivo define cómo deben trabajar las personas y los agentes de código en Letter Rush. Sus reglas aplican a todo el repositorio. Si una instrucción explícita del usuario contradice este documento, prevalece la instrucción del usuario.

## Principios de trabajo

- Mantén el proyecto KISS y DRY: resuelve el problema más pequeño posible y conserva una sola fuente de verdad para reglas, estado y configuración.
- Preserva la base ligera del proyecto: HTML, CSS y JavaScript ES Modules, sin framework, bundler ni dependencias de runtime.
- No agregues abstracciones, dependencias o capas por anticipación. Hazlo sólo cuando eliminen duplicidad real o habiliten un requisito concreto.
- Realiza cambios pequeños y cohesivos. Evita refactors no relacionados y conserva el trabajo local existente.
- Usa nombres y APIs internos en inglés; conserva en español los textos visibles para el usuario y la documentación orientada al público actual.
- Prioriza `const`, nombres descriptivos, indentación de dos espacios, comillas dobles y punto y coma, siguiendo el estilo existente.

## Arquitectura y responsabilidades

```text
index.html / styles.css       interfaz y estilos
src/main.js                   composición de dependencias
src/application/              orquestación, navegador y persistencia
src/core/                     reglas y estado puros
src/ui/                       render y DOM
src/workers/                  protocolo y reloj de simulación
test/                         pruebas con node:test por responsabilidad
assets/                       capturas e imagen social pública
```

- `GameEngine` es la única fuente de verdad para reglas, puntuación, letras y evolución del estado. Debe permanecer independiente del DOM y de APIs del navegador.
- `GameWorkerRuntime` controla el reloj y el protocolo de mensajes. El Worker y el fallback local deben reutilizar el mismo runtime; no dupliques reglas.
- `GameRuntime` posee la frontera Worker/fallback y agrupa snapshots antes de entregarlos a la UI.
- `GameController` conecta eventos, navegación, persistencia y runtime. No muevas reglas del juego al controlador.
- `GameRenderer` es la única capa que modifica vistas, HUD, overlays y nodos de letras. No mezcles reglas de negocio con render.
- Mantén los mensajes del Worker y los snapshots serializables. Cuando el tamaño importe, considera transferibles en lugar de copiar buffers grandes.
- Inyecta reloj, aleatoriedad y schedulers cuando una lógica necesite ser determinista o comprobable.

## Rendimiento de UI y Worker

- Conserva una sola simulación en un Web Worker y el fallback local para navegadores que no puedan crearlo.
- Mantén el hilo principal dedicado a entrada y DOM. No agregues trabajo continuo por frame que pueda hacerse en la simulación.
- Limita el render a un máximo de 60 Hz, agrupa snapshots y reutiliza nodos existentes; evita reconstruir el tablero completo.
- Anima posiciones con `transform` y conserva el movimiento basado en `deltaTime`, no en el número de frames.
- No crees Workers adicionales sin medir primero y demostrar un cuello de botella independiente.
- Para un cambio de rendimiento, registra el escenario reproducible y comprueba que no cambien reglas, puntuación, pausa ni límites del tablero.

## Accesibilidad y experiencia

- Conserva HTML semántico, navegación por teclado, foco visible y estados comprensibles sin depender sólo del color.
- Mantén los controles `A–Z` y `Esc`, y no bloquees botones equivalentes para usuarios sin teclado físico.
- Respeta `prefers-reduced-motion`; evita animaciones imprescindibles para entender el estado.
- Verifica escritorio y móvil, contraste suficiente, overlays legibles y ausencia de desbordamiento horizontal.
- Si cambias textos o flujo, comprueba menú, cuenta regresiva, partida, pausa y resultados.

## Pruebas y validación

Las pruebas deben ser proporcionales al riesgo. Usa TDD para reglas nuevas, regresiones o contratos observables; no escribas pruebas duplicadas para detalles internos ya cubiertos en otra capa.

- Motor: reglas puras, transiciones, límites y puntuación.
- Runtime/Worker: protocolo, temporización, fallback y agrupación de snapshots.
- Controlador: integración de eventos, navegación y persistencia.
- Renderer: resultados DOM observables y reutilización relevante de nodos.
- Evita probar la misma regla en motor, runtime, controlador y renderer. Colócala en la capa que la posee y agrega sólo las integraciones que puedan fallar de manera distinta.
- Una corrección debe incluir una prueba de regresión cuando pueda expresarse de forma estable.
- No persigas cobertura numérica por sí sola ni pruebes implementaciones privadas.

Antes de entregar cualquier cambio ejecuta:

```bash
npm test
git diff --check
```

Para cambios JavaScript, valida además la sintaxis de los archivos modificados con `node --check`. Para cambios de UI, Worker o flujo, levanta el proyecto y realiza una prueba manual en navegador:

```bash
npm run dev
# http://localhost:4173
```

Comprueba la consola del navegador y, según el alcance, inicio, teclado, pausa/reanudación, fin de partida, persistencia y viewport móvil.

## Assets, metadata y despliegue

- `assets/social-preview.png` es la imagen social pública canónica del proyecto (1280 × 640). Debe permanecer versionada en el repositorio.
- Si reemplazas esa imagen, conserva su ruta o actualiza en conjunto Open Graph/Twitter en `index.html`, el Social Preview de GitHub y la URL desplegada.
- No elimines `assets/menu.png` ni `assets/juego.png`; son las capturas históricas. Las capturas actuales o futuras deben convivir con ellas.
- Optimiza imágenes nuevas para web y usa nombres descriptivos en minúsculas con guiones.
- El dominio público canónico es `https://letterconcurrentgame.netlify.app/`. No lo renombres ni lo sustituyas sin una petición explícita del propietario.
- `netlify.toml` es la configuración de despliegue. Si alguna vez cambia la URL pública, actualiza coordinadamente canonical, Open Graph, Twitter, `package.json` y README.

## Seguridad y mantenimiento

- Nunca incluyas secretos, tokens, credenciales, datos personales, `node_modules` ni artefactos temporales en commits.
- Conserva permisos mínimos en GitHub Actions. Al modificar CI, usa acciones oficiales o confiables y fija revisiones inmutables cuando sea práctico.
- No uses force-push, resets destructivos ni borres cambios ajenos.
- Mantén Node.js 20 o superior y evita agregar una dependencia para una tarea que la plataforma ya resuelve de forma clara.

## Flujo Git y Conventional Commits

Este repositorio trabaja directamente sobre `master` por decisión del propietario. Antes de publicar, confirma que `master` esté sincronizada, que el diff contenga sólo el cambio solicitado y que todas las validaciones relevantes pasen. Haz staging con rutas explícitas y luego push a `origin master`. Nunca fuerces el push.

Todos los commits deben seguir Conventional Commits 1.0.0:

```text
<type>[optional scope][!]: <description>
```

Tipos permitidos:

- `feat`: nueva funcionalidad observable.
- `fix`: corrección de un defecto.
- `docs`: sólo documentación.
- `test`: sólo pruebas.
- `refactor`: cambio interno sin nueva función ni corrección.
- `perf`: mejora de rendimiento.
- `style`: formato sin cambio de comportamiento.
- `build`: sistema de build o dependencias.
- `ci`: automatización e integración continua.
- `chore`: mantenimiento que no encaja en los anteriores.
- `revert`: reversión de un commit anterior.

Usa una descripción breve, imperativa, en minúsculas y sin punto final. Cada commit debe representar un cambio lógico. Marca una incompatibilidad con `!` y explica sus efectos en un footer `BREAKING CHANGE:`.

Ejemplos:

```text
feat(engine): add endless mode
fix(worker): preserve board bounds at startup
perf(renderer): coalesce letter position updates
docs: document agent workflow
ci: pin action revisions
```

Secuencia de entrega:

```bash
git status -sb
git diff --check
npm test
git add <archivos-del-cambio>
git diff --cached
git commit -m "<conventional-commit>"
git push origin master
```

## Referencias

- [AGENTS.md: formato abierto para instrucciones de agentes](https://agents.md/)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [GitHub Actions: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
