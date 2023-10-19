// const Matter = require('matter-js');

function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

const rand = mulberry32(Date.now());

const {
	Engine, Render, Runner, Composites, Common, MouseConstraint, Mouse,
	Composite, Bodies, Events
} = Matter;

const wallPad = 64;
const friction = { friction: 0.005, frictionStatic: 0.005, frictionAir: 0, restitution: 0.1 };

const GameStates = {
	WAIT: 0,
	DROP: 1,
	LOSE: 2,
	WIN: 3,
}

const Game = {
	width: 640,
	height: 960,
	elements: {
		canvas: document.getElementById('game-canvas'),
		score: document.getElementById('game-score'),
		end: document.getElementById('game-end'),
		previewBall: null,
	},
	sounds: {
		click: new Audio('./assets/click.mp3'),
		pop0: new Audio('./assets/pop0.mp3'),
		pop1: new Audio('./assets/pop1.mp3'),
		pop2: new Audio('./assets/pop2.mp3'),
		pop3: new Audio('./assets/pop3.mp3'),
		pop4: new Audio('./assets/pop4.mp3'),
		pop5: new Audio('./assets/pop5.mp3'),
		pop6: new Audio('./assets/pop6.mp3'),
		pop7: new Audio('./assets/pop7.mp3'),
		pop8: new Audio('./assets/pop8.mp3'),
		pop9: new Audio('./assets/pop9.mp3'),
		pop10: new Audio('./assets/pop10.mp3'),
	},

	stateIndex: 0,

	score: 0,
	calculateScore: function () {
		const score = Composite.allBodies(engine.world).reduce((acc, cur) => {
			if (cur.isStatic) return acc;
			return acc + this.fruitSizes[cur.sizeIndex].scoreValue;
		}, 0);
		this.score = score;
		this.elements.score.innerText = this.score;
	},

	fruitSizes: [
		{ radius: 24,  scoreValue: 1,    img: './assets/img/circle0.png'  },
		{ radius: 32,  scoreValue: 2,    img: './assets/img/circle1.png'  },
		{ radius: 40,  scoreValue: 4,    img: './assets/img/circle2.png'  },
		{ radius: 56,  scoreValue: 10,   img: './assets/img/circle3.png'  },
		{ radius: 64,  scoreValue: 20,   img: './assets/img/circle4.png'  },
		{ radius: 72,  scoreValue: 40,   img: './assets/img/circle5.png'  },
		{ radius: 84,  scoreValue: 80,   img: './assets/img/circle6.png'  },
		{ radius: 96,  scoreValue: 160,  img: './assets/img/circle7.png'  },
		{ radius: 128, scoreValue: 320,  img: './assets/img/circle8.png'  },
		{ radius: 160, scoreValue: 640,  img: './assets/img/circle9.png'  },
		{ radius: 192, scoreValue: 1280, img: './assets/img/circle10.png' },
	],
	nextFruitSize: 0,

	loseGame: function () {
		Game.stateIndex = GameStates.LOSE;
		Game.elements.end.innerText = "You Lose The Game!!! (refresh to try again)";
		runner.enabled = false;
	},

	// Returns an index, or null
	lookupFruitIndex: function (radius) {
		const sizeIndex = this.fruitSizes.findIndex(size => size.radius == radius);
		if (sizeIndex === undefined) return null;
		if (sizeIndex === this.fruitSizes.length - 1) return null;

		return sizeIndex;
	},

	generateFruitBody: function (x, y, sizeIndex, extraConfig = {}) {
		const size = this.fruitSizes[sizeIndex];
		const circle = Bodies.circle(x, y, size.radius, {
			...friction,
			...extraConfig,
			render: { sprite: { texture: size.img, xScale: size.radius / 512, yScale: size.radius / 512 } },
		});
		circle.sizeIndex = sizeIndex;

		return circle;
	},
	addFruit: function (x) {
		if (this.stateIndex !== GameStates.WAIT) return;

		this.sounds.click.play();

		this.stateIndex = GameStates.DROP;
		const latestFruit = this.generateFruitBody(x, 0, this.nextFruitSize);
		Composite.add(engine.world, latestFruit);

		this.nextFruitSize = Math.floor(rand() * 4);
		this.calculateScore();

		Composite.remove(engine.world, Game.elements.previewBall);
		Game.elements.previewBall = Game.generateFruitBody(render.mouse.position.x, 0, Game.nextFruitSize, { isStatic: true });

		setTimeout(() => {
			if (Game.stateIndex === GameStates.DROP) {
				Composite.add(engine.world, Game.elements.previewBall);
				Game.stateIndex = GameStates.WAIT;
			}
		}, 500);
	}
}

const engine = Engine.create();
const render = Render.create({
	element: Game.elements.canvas,
	engine,
	options: {
		width: Game.width,
		height: Game.height,
		wireframes: false,
		background: 'transparent'
	}
});

const statics = [
	// Left
	Bodies.rectangle(-(wallPad / 2), Game.height / 2, wallPad, Game.height, { isStatic: true, ...friction }),

	// Right
	Bodies.rectangle(Game.width + (wallPad / 2), Game.height / 2, wallPad, Game.height, { isStatic: true, ...friction }),

	// Bottom
	Bodies.rectangle(Game.width / 2, Game.height + (wallPad / 2), Game.width, wallPad, { isStatic: true, ...friction }),
];
Composite.add(engine.world, statics);

Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, 0, 0, { isStatic: true });
Composite.add(engine.world, Game.elements.previewBall);

// add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
	mouse: mouse,
	constraint: {
		stiffness: 0.2,
		render: {
			visible: false
		}
	}
});
render.mouse = mouse;

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

Events.on(mouseConstraint, 'mouseup', function (e) {
	Game.addFruit(e.mouse.position.x);
});

Events.on(mouseConstraint, 'mousemove', function (e) {
	Game.elements.previewBall.position.x = e.mouse.position.x;
});

Events.on(engine, 'collisionStart', function (e) {
	// change object colours to show those starting a collision
	for (let i = 0; i < e.pairs.length; i++) {
		const pair = e.pairs[i];

		// Skip if collision is wall
		if (pair.bodyA.isStatic || pair.bodyB.isStatic) continue;

		// Uh oh, too high!
		if (pair.bodyA.position.y < 64 || pair.bodyB.position.y < 64) {
			Game.loseGame();
			return;
		}

		// Skip different sizes
		if (pair.bodyA.circleRadius !== pair.bodyB.circleRadius) continue;

		const { sizeIndex, circleRadius } = pair.bodyA;

		// Skip if largest size already
		if (circleRadius >= Game.fruitSizes[Game.fruitSizes.length - 1].radius) continue;

		// Therefore, circles are same size, so merge them.
		const midPosX = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
		const midPosY = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;

		// const sizeIndex = Game.lookupFruitIndex(radius);
		// if (sizeIndex === null) continue;

		Game.sounds[`pop${sizeIndex}`].play();
		Composite.remove(engine.world, [pair.bodyA, pair.bodyB]);
		Composite.add(engine.world, Game.generateFruitBody(midPosX, midPosY, sizeIndex + 1));
		Game.calculateScore();
	}
});
