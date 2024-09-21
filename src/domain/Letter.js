class Letter {
  constructor(character, x, y, color) {
    this.character = character;
    this.x = x;
    this.y = y;
    this.color = color;
  }

  move(distance) {
    this.y += distance;
  }
}

export default Letter;
