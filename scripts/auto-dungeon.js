class AutoDungeon {
  static startButtonSelector =
    "#townView > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > button:nth-child(1)";
  static stop = false;
  static chestMode = ["rare", "epic", "legendary", "mythic"];
  static verbose = false;

  static startDungeon(init = false, options = {}) {
    if (init) {
      AutoDungeon.stop = false;
    }

    if (options) {
      if (options.chestMode) {
        AutoDungeon.chestMode = options.chestMode;
      }
      if (options.verbose) {
        AutoDungeon.verbose = options.verbose;
      }
    }

    if (AutoDungeon.stop) {
      console.log("Stop requested");
      return;
    }

    const button = document.querySelector(AutoDungeon.startButtonSelector);
    if (button) {
      button.click();
      requestAnimationFrame(AutoDungeon.configureDungeon);
      return;
    }
  }

  static stopDungeon = () => {
    AutoDungeon.stop = true;
  };

  static isDungeonStillRunning = () => document.querySelector(".dungeon-board");

  static configureDungeon = () => {
    const dungeon = document.querySelector(
      ".dungeon-board > tbody:nth-child(1)"
    );
    const size = dungeon.children.length;
    const middle = Math.floor(size / 2);
    let positionX = middle;
    let positionY = size - 1;
    let positionXBoss = null;
    let positionYBoss = null;
    let positionXChest = null;
    let positionYChest = null;
    let chosenChestName = "";
    let initial = true;
    let moveToRight = true;
    let moveToTop = true;
    let sizeChanged = false;
    let hasMoveLeftOrRightOnce = false;
    let openedChests = 0;

    const getBossPosition = () => {
      const tile = document.querySelector(".tile-boss, .tile-ladder");
      if (!tile) {
        positionXBoss = null;
        positionYBoss = null;
        return;
      }
      const parent = tile.parentElement;
      positionXBoss = [...parent.children].indexOf(tile);
      positionYBoss = [...parent.parentElement.children].indexOf(parent);
    };

    const wantedChests = (chestMode) => {
      let query = "";
      if (Array.isArray(chestMode)) {
        query = chestMode.map((mode) => `.tile-chest-${mode}`).join(",");
      } else {
        query = `.tile-chest-${chestMode}`;
      }
      return document.querySelectorAll(query);
    };

    const getChestPosition = (chestMode) => {
      const tiles = wantedChests(chestMode);
      if (!tiles || !tiles.length) {
        positionXChest = null;
        positionYChest = null;
        return;
      }
      const tile = Array.from(tiles).reduceRight(
        (prev, current) => {
          let chosenChestName = current.className
            .split(" ")
            .find((e) => e.includes("tile-chest-"))
            .substring(11);
          const parent = current.parentElement;
          let positionXChest = [...parent.children].indexOf(current);
          let positionYChest = [...parent.parentElement.children].indexOf(
            parent
          );
          let distance =
            Math.abs(positionX - positionXChest) +
            Math.abs(positionY - positionYChest);
          if (prev.distance < distance) {
            return prev;
          }
          return {
            distance,
            positionXChest,
            positionYChest,
            chosenChestName,
          };
        },
        {
          distance: Infinity,
          positionXChest: null,
          positionYChest: null,
          chosenChestName: "",
        }
      );
      positionXChest = tile.positionXChest;
      positionYChest = tile.positionYChest;
      chosenChestName = tile.chosenChestName;
    };

    const getCurrentPlayerPosition = () => {
      const tile = document.querySelector(".tile-player");
      if (!tile) {
        sizeChanged = true; // Failsafe, reset dungeon
        return;
      }
      const parent = tile.parentElement;
      positionX = [...parent.children].indexOf(tile);
      positionY = [...parent.parentElement.children].indexOf(parent);
      sizeChanged = parent.children.length !== size;
    };

    const allChestsDiscovered = () => {
      const chests = document.querySelectorAll(".tile-chest");
      return chests.length + openedChests === size;
    };

    const wantedChestsStillPresents = () => {
      const chests = wantedChests(AutoDungeon.chestMode);
      return chests.length > 0 || !allChestsDiscovered();
    };

    const moveUp = (force = false) => {
      AutoDungeon.verbose && console.log("Moving up");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowUp",
        code: "ArrowUp",
      });
      document.dispatchEvent(event);
      if (!force && hasMoveLeftOrRightOnce) {
        moveToRight = !moveToRight;
        hasMoveLeftOrRightOnce = false;
      }
      requestAnimationFrame(chooseWhatToDo);
    };

    const moveDown = (force = false) => {
      AutoDungeon.verbose && console.log("Moving down");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        code: "ArrowDown",
      });
      document.dispatchEvent(event);
      if (!force && hasMoveLeftOrRightOnce) {
        moveToRight = !moveToRight;
        hasMoveLeftOrRightOnce = false;
      }
      requestAnimationFrame(chooseWhatToDo);
    };

    const moveLeft = () => {
      AutoDungeon.verbose && console.log("Moving left");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        code: "ArrowLeft",
      });
      hasMoveLeftOrRightOnce = true;
      document.dispatchEvent(event);
      requestAnimationFrame(chooseWhatToDo);
    };

    const moveRight = () => {
      AutoDungeon.verbose && console.log("Moving right");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        code: "ArrowRight",
      });
      hasMoveLeftOrRightOnce = true;
      document.dispatchEvent(event);
      requestAnimationFrame(chooseWhatToDo);
    };

    const moveToChest = (chestMode) => {
      getChestPosition(chestMode);
      if (positionXChest === null || positionYChest === null) {
        return false;
      }
      AutoDungeon.verbose && console.log(`Go to ${chosenChestName} chest`);
      return goToTile(positionXChest, positionYChest);
    };

    const moveToBoss = () => {
      getBossPosition();
      if (positionXBoss === null && positionYBoss === null) {
        return false;
      }
      AutoDungeon.verbose && console.log("Go to boss");
      const event = new MouseEvent("click");
      const bossTile = document.querySelector(".tile-boss, .tile-ladder");
      if (bossTile) {
        bossTile.dispatchEvent(event);
        DungeonRunner.handleInteraction();
      }
      return goToTile(positionXBoss, positionYBoss);
    };

    const goToTile = (X, Y) => {
      const next = DungeonAStar.aStarAlgorithm(
        { x: positionX, y: positionY },
        { x: X, y: Y },
        size
      );
      if (next) {
        X = next.x;
        Y = next.y;
      }
      if (Y < positionY) {
        moveUp();
        return true;
      } else if (Y > positionY) {
        moveDown();
        return true;
      } else if (X < positionX) {
        moveLeft();
        return true;
      } else if (X > positionX) {
        moveRight();
        return true;
      }
      return false;
    };

    const chooseWhatToDo = () => {
      if (
        DungeonRunner.map.currentTile().type() ===
        GameConstants.DungeonTile.chest
      ) {
        openedChests++;
        interact();
        return;
      }
      if (
        [
          GameConstants.DungeonTile.boss,
          GameConstants.DungeonTile.ladder,
        ].includes(DungeonRunner.map.currentTile().type()) &&
        !wantedChestsStillPresents()
      ) {
        interact();
        return;
      }
      move();
      return;
    };

    const move = () => {
      if (AutoDungeon.stop) {
        return;
      }
      if (!AutoDungeon.isDungeonStillRunning()) {
        console.log("Dungeon finished");
        requestAnimationFrame(AutoDungeon.startDungeon);
        return;
      }

      if (DungeonRunner.fighting() || DungeonBattle.catching()) {
        requestAnimationFrame(move);
        return;
      }

      getCurrentPlayerPosition();
      if (sizeChanged) {
        requestAnimationFrame(AutoDungeon.configureDungeon);
        return;
      }

      if (AutoDungeon.chestMode) {
        if (moveToChest(AutoDungeon.chestMode)) {
          return;
        }
        if (!wantedChestsStillPresents() && moveToBoss()) {
          return;
        }
        if (moveToChest(["common", "rare", "epic", "legendary", "mythic"])) {
          return;
        }
      } else {
        if (!moveToTop && moveToBoss()) {
          return;
        }
      }

      if (initial) {
        moveLeft();
        if (positionX <= 0) {
          initial = false;
        }
        return;
      }
      if (positionY === 0) {
        moveToTop = false;
      }
      if (moveToRight) {
        if (positionX === size - 1) {
          if (!moveToTop) {
            moveDown();
            return;
          }
          moveUp();
          return;
        }
        moveRight();
        return;
      } else {
        if (positionX === 0) {
          if (!moveToTop) {
            moveDown();
            return;
          }
          moveUp();
          return;
        }
        moveLeft();
        return;
      }
    };
    const interact = () => {
      if (AutoDungeon.stop) {
        return;
      }
      if (!AutoDungeon.isDungeonStillRunning()) {
        console.log("Dungeon finished");
        requestAnimationFrame(AutoDungeon.startDungeon);
        return;
      }
      getCurrentPlayerPosition();
      if (positionX === middle && positionY === size - 1) {
        requestAnimationFrame(move);
        return;
      }

      DungeonRunner.handleInteraction();
      requestAnimationFrame(move);
    };

    requestAnimationFrame(move);
  };
}