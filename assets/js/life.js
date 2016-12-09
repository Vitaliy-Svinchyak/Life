;(function () {

  'use strict';
  document.addEventListener('DOMContentLoaded', function () {

    class Life {

      constructor(config) {
        this.config = this.filterConfig(config);
        this.playground = document.getElementById("playground");
        this.context = this.playground.getContext('2d');
        this.header = document.getElementsByTagName("header")[0];
        this.info = document.getElementsByTagName("info")[0];
        this.canEdit = true;
        this.alive = [];
        this.population = [];
        this.blocks = this.canBorn = this.toDie = {};
        this.generation = this.borned = this.loneliness = this.overcrowding = 0;
        this.gameStarted = false;

        this.elements = {
          headerToggle: document.querySelector(".toggle-header"),
          infoToggle: document.querySelector(".toggle-info"),
          createButton: document.getElementById("create"),
          autoGenerateButton: document.getElementById("auto"),
          startButtons: document.getElementsByClassName("play"),
          rowsInput: document.getElementById("rows"),
          columnsInput: document.getElementById("columns"),
          modalBlock: document.getElementById("myModal")
        };

        this.bindHeaderToggle()
          .bindConfigToggle()
          .bindButtons();
      }

      filterConfig(config) {
        if (!config) {
          config = {};
        }
        config.generationTime = config.generationTime ? config.generationTime : 500;
        return config;
      }

      /**
       * Bind toggle for right menu with config
       *
       * @returns {Life}
       */
      bindHeaderToggle() {
        this.elements.headerToggle.addEventListener('click', (e) => {
          let icon = e.target.classList.contains('glyphicon') ? e.target : e.target.firstChild;
          let open = icon.classList.contains("glyphicon-eye-open");
          let right = 0;

          icon.classList.toggle("glyphicon-eye-close");
          icon.classList.toggle("glyphicon-eye-open");

          if (!open) {
            right = "-300px"
          }

          this.header.style.right = right;
        });

        return this;
      }

      /**
       * Toggle for info in right bottom
       *
       * @returns {Life}
       */
      bindConfigToggle() {
        this.elements.infoToggle.addEventListener('click', (e) => {
          let icon = e.target.classList.contains('glyphicon') ? e.target : e.target.firstChild;

          icon.classList.toggle("glyphicon-eye-close");
          icon.classList.toggle("glyphicon-eye-open");
          this.info.classList.toggle("mini");
        });

        return this;
      }

      /**
       * Binds create, autoGenerate, playground, start buttons eventListeners
       */
      bindButtons() {
        this.elements.createButton.addEventListener('click', () => {
          this.canEdit = false;
          this.create();
        });

        this.elements.autoGenerateButton.addEventListener('click', () => this.autoGenerate());

        this.playground.addEventListener('mousedown', () => {
          this.canEdit = true;
          this.createElements();
        });

        this.playground.addEventListener('mouseup', () => {
          this.canEdit = false;
        });

        let buttonIndex = 0;
        let buttonsList = this.elements.startButtons;
        let listLength = buttonsList.length;

        for (buttonIndex; buttonIndex < listLength; buttonIndex++) {
          buttonsList[buttonIndex].addEventListener('click', () => this.start());
        }
      }

      /**
       * Creates a playground
       */
      create() {
        this.canEdit = true;

        this.rows = this.elements.rowsInput.value;
        this.columns = this.elements.columnsInput.value;

        this.playground.style.display = "block";
        this.playground.width = this.columns * 10;
        this.playground.height = this.rows * 10;

        this.drawGrid();
      }

      /**
       * Draws grid
       */
      drawGrid() {
        let coordinate = 0.5;
        let playGroundWidth = this.playground.width;
        let playGroundHeight = this.playground.height;

        for (coordinate; coordinate <= playGroundWidth; coordinate += 10) {
          //Column
          this.context.moveTo(coordinate, 0);
          this.context.lineTo(coordinate, playGroundHeight);
          //Row
          this.context.moveTo(0, coordinate);
          this.context.lineTo(playGroundWidth, coordinate);
        }

        this.context.strokeStyle = "#eee";
        this.context.stroke();
      }

      /**
       * Calculates a number of rows & columns based on screen width & height
       * And calls create()
       */
      autoGenerate() {
        this.columns = Math.floor((window.innerWidth - 35) / 10);
        this.rows = Math.floor((window.innerHeight - 35) / 10);

        this.elements.rowsInput.value = this.rows;
        this.elements.columnsInput.value = this.columns;
        this.create();
        this.elements.headerToggle.click();
      }

      /**
       * Creates an element
       */
      createElements() {
        this.playground.addEventListener('mousemove', (e) => {
          if (this.canEdit) {

            const x = Math.floor(e.layerX / 10) * 10 - 9;
            const y = Math.floor(e.layerY / 10) * 10 - 9;

            this.context.fillRect(x, y, 9, 9);
            this.blocks[x + ":" + y] = {x: x, y: y};

          }
        });
      }

      /**
       * Закрывает поле на редактирование
       * Запускает интервал созданяи новых поколений
       * @returns {boolean} false при конце игры
       */
      start() {
        if (!this.gameStarted) {
          this.canEdit = false;
          this.gameStarted = true;

          let interval = setInterval(() => {
            this.findPotentialChilds();

            //If everybody died
            if (Object.keys(this.blocks).length == 0) {
              clearInterval(interval);
              this.showStatistic();

              return false;
            }

            //Последние три не одинаковы
            if (this.alive[this.alive.length - 1] == this.alive[this.alive.length - 2]
              && this.alive[this.alive.length - 2] == this.alive[this.alive.length - 3]
              && this.alive.length >= 2) {
              clearInterval(interval);
              this.showStatistic();

              return false;
            }

            this.filterBorned();
            this.nextGeneration();
          }, this.config.generationTime);
        }
      }

      /**
       * Filters whom to die and whom to born
       */
      findPotentialChilds() {
        this.toDie = {};
        this.canBorn = {};

        for (let coordinate in this.blocks) {
          if (this.blocks.hasOwnProperty(coordinate)) {
            const unit = this.blocks[coordinate];
            let neighbors = 0;
            let neighborUnits = Life.getUnitsToCheck(unit);

            //Calculating a number of neighbors
            calculateNeighbors :for (let neighborKey in neighborUnits) {

              const neighbor = neighborUnits[neighborKey];
              const neighborCoordinate = neighbor.x + ":" + neighbor.y;

              if (this.blocks[neighborCoordinate] == undefined) {
                this.canBorn[neighborCoordinate] = {x: neighbor.x, y: neighbor.y};
              }
              else {
                neighbors++;
                if (neighbors > 3) {
                  break calculateNeighbors;
                }
              }
            }

            if (neighbors < 3) {
              this.toDie[coordinate] = unit;
              this.loneliness++;
            }
            else if (neighbors > 3) {
              this.toDie[coordinate] = unit;
              this.overcrowding++;
            }
          }
        }
      }

      /**
       * Очищает список детей от невозможныых
       */
      filterBorned() {
        for (let unitCoordinate in this.canBorn) {
          if (this.canBorn.hasOwnProperty(unitCoordinate)) {
            const unit = this.canBorn[unitCoordinate];
            let parents = 0;
            let neighborUnits = Life.getUnitsToCheck(unit);

            for (let neighborKey in neighborUnits) {
              const neighbor = neighborUnits[neighborKey];
              const neighborCoordinate = neighbor.x + ":" + neighbor.y;

              if (this.blocks[neighborCoordinate] != undefined) {
                parents++;

                if (parents > 3) {
                  break;
                }
              }
            }

            if (parents != 3) {
              delete this.canBorn[unitCoordinate];
            }
          }
        }
      }

      /**
       * Returns an array of units to check on exist
       * @param   {object} unit Unit around whom we must check
       * @returns {Array}  Array of units to check
       */
      static getUnitsToCheck(unit) {
        return [
          {x: unit.x, y: unit.y - 10},
          {x: unit.x, y: unit.y + 10},
          {x: unit.x - 10, y: unit.y},
          {x: unit.x - 10, y: unit.y - 10},
          {x: unit.x - 10, y: unit.y + 10},
          {x: unit.x + 10, y: unit.y},
          {x: unit.x + 10, y: unit.y - 10},
          {x: unit.x + 10, y: unit.y + 10},
        ];
      }

      /**
       * Убивает невыживших
       * Создаёт детей
       * Вызывает обновление инфы
       */
      nextGeneration() {
        this.borned += Object.keys(this.canBorn).length;
        this.population.push(Object.keys(this.blocks).length);

        //Killing
        for (let killCoordinate in this.toDie) {
          if (this.toDie.hasOwnProperty(killCoordinate)) {
            let unit = this.toDie[killCoordinate];
            this.context.clearRect(unit.x, unit.y, 9, 9);

            delete this.blocks[killCoordinate];
            delete this.toDie[killCoordinate];
          }
        }

        //Creating
        for (let createCoordinate in this.canBorn) {
          if (this.canBorn.hasOwnProperty(createCoordinate)) {
            let unit = this.canBorn[createCoordinate];
            this.context.fillRect(unit.x, unit.y, 9, 9);

            delete this.canBorn[createCoordinate];
            this.blocks[createCoordinate] = unit;
          }
        }

        this.generation++;
        this.alive.push(Object.keys(this.blocks).length);
        this.updateInfo();
      }

      /**
       * Обновляет инфу
       */
      updateInfo() {
        document.getElementById("generation").textContent = this.generation;
        document.getElementById("borned").textContent = this.borned;
        document.getElementById("died").textContent = this.overcrowding + this.loneliness;
        document.getElementById("overcrowding").textContent = this.overcrowding;
        document.getElementById("loneliness").textContent = this.loneliness;
      }

      /**
       * Draws a graphic
       */
      showStatistic() {
        let x = 0;
        let y = 0;
        const playGroundHeight = this.playground.height;
        const playGroundWidth = this.playground.width;
        const xStep = (playGroundWidth - 210) / this.population.length;
        const yStep = (playGroundHeight - 60) / Math.max.apply(Math, this.population);

        this.drawArrows();

        this.context.beginPath();

        this.context.moveTo(10, playGroundHeight - 10);

        this.population.forEach((e) => {
          y = this.playground.height - (e * yStep) - 10;
          this.context.lineTo(x + 10, y);
          x += xStep;
        });

        this.context.strokeStyle = "#51be6e";
        this.context.lineWidth = 2;
        this.context.stroke();
      }

      /**
       * Рисует стрелочки
       */
      drawArrows() {
        const playGroundHeight = this.playground.height;
        const playGroundWidth = this.playground.width;

        this.context.clearRect(0, 0, playGroundWidth, playGroundHeight);
        this.context.font = "italic 14pt Arial";
        this.context.beginPath();

        //Left bottom
        this.context.moveTo(0, playGroundHeight - 10);
        this.context.lineTo(playGroundWidth / 2 - 30, playGroundHeight - 10);

        this.context.fillText("Generation", playGroundWidth / 2 - 25, playGroundHeight - 5);

        //Right bottom
        this.context.moveTo(playGroundWidth / 2 + 80, playGroundHeight - 10);
        this.context.lineTo(playGroundWidth - 200, playGroundHeight - 10);

        //Bottom arrow
        this.context.lineTo(playGroundWidth - 205, playGroundHeight - 15);
        this.context.moveTo(playGroundWidth - 200, playGroundHeight - 10);
        this.context.lineTo(playGroundWidth - 205, playGroundHeight - 5);

        //Right Top
        this.context.moveTo(10, playGroundHeight);
        this.context.lineTo(10, playGroundHeight / 2);

        this.context.fillText("Population", 5, playGroundHeight / 2 - 10);

        //Left top
        this.context.moveTo(10, playGroundHeight / 2 - 30);
        this.context.lineTo(10, 50);
        //Left arrow
        this.context.lineTo(15, 55);
        this.context.moveTo(10, 50);
        this.context.lineTo(5, 55);

        this.context.strokeStyle = "#000";
        this.context.stroke();
      }

    }

    let config = {
      generationTime: 200
    };
    new Life(config);

  });
})();