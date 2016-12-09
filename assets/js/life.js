;(function () {

  'use strict';
  document.addEventListener('DOMContentLoaded', function () {

    class Life {

      constructor(config) {
        this.config = this.filterConfig(config);
        this.playground = document.getElementById("playground");
        this.context = this.playground.getContext('2d');

        /**
         * aliveCount - an array of number of alive units for defence from loop
         * population - an array of number of population for final statistic
         *
         */
        this.aliveCount = this.population = [];
        this.blocks = this.toBorn = this.toDie = {};
        this.generation = this.borned = this.loneliness = this.overcrowding = 0;
        this.canEdit = true;
        this.gameStarted = false;

        this.elements = {
          toggle: {
            header: document.querySelector(".toggle-header"),
            info: document.querySelector(".toggle-info"),
          },
          buttons: {
            create: document.getElementById("create"),
            autoGenerate: document.getElementById("auto"),
            start: document.getElementsByClassName("play"),
          },
          input: {
            rows: document.getElementById("rows"),
            columns: document.getElementById("columns"),
          },
          blocks: {
            header: document.getElementsByTagName("header")[0],
            info: document.getElementsByTagName("info")[0],
          }
        }
        ;

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
        this.elements.toggle.header.addEventListener('click', (e) => {
          let icon = e.target.classList.contains('glyphicon') ? e.target : e.target.firstChild;
          let open = icon.classList.contains("glyphicon-eye-open");
          let right = 0;

          icon.classList.toggle("glyphicon-eye-close");
          icon.classList.toggle("glyphicon-eye-open");

          if (!open) {
            right = "-300px"
          }

          this.elements.blocks.header.style.right = right;
        });

        return this;
      }

      /**
       * Toggle for info in right bottom
       *
       * @returns {Life}
       */
      bindConfigToggle() {
        this.elements.toggle.info.addEventListener('click', (e) => {
          let icon = e.target.classList.contains('glyphicon') ? e.target : e.target.firstChild;

          icon.classList.toggle("glyphicon-eye-close");
          icon.classList.toggle("glyphicon-eye-open");
          this.elements.blocks.info.classList.toggle("mini");
        });

        return this;
      }

      /**
       * Binds create, autoGenerate, playground, start buttons eventListeners
       */
      bindButtons() {
        this.elements.buttons.create.addEventListener('click', () => {
          this.canEdit = false;
          this.create();
        });

        this.elements.buttons.autoGenerate.addEventListener('click', () => this.autoGenerate());

        this.playground.addEventListener('mousedown', () => {
          if (!this.gameStarted) {
            this.canEdit = true;
            this.createElements();
          }
        });

        this.playground.addEventListener('mouseup', () => {
          this.canEdit = false;
        });

        document.getElementById('colors').addEventListener('change', (e) => {
          this.config.randomColor = e.target.checked;
        });
        document.getElementById('clearChilds').addEventListener('change', (e) => {
          this.config.clearChilds = e.target.checked;
        });


        let buttonIndex = 0;
        let buttonsList = this.elements.buttons.start;
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

        this.rows = this.elements.input.rows.value;
        this.columns = this.elements.input.columns.value;

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

        this.elements.input.rows.value = this.rows;
        this.elements.input.columns.value = this.columns;
        this.create();
        this.elements.toggle.header.click();
      }

      /**
       * Creates an element
       */
      createElements() {
        let eventHandler = (e) => {
          const x = Math.floor(e.layerX / 10) * 10;
          const y = Math.floor(e.layerY / 10) * 10;

          this.createBlock(x, y);
        };
        this.playground.addEventListener('mousemove', (e) => this.canEdit ? eventHandler(e) : false);

        this.playground.addEventListener('click', (e) => !this.gameStarted ? eventHandler(e) : false);
      }

      createBlock(x, y) {
        if (x < 0 || y < 0 ||
          x > this.config.maxX || y > this.config.maxY) {
          return false;
        }
        if (!this.blocks[x + ":" + y]) {

          if (this.config.randomColor) {
            this.context.fillStyle = this.getRandomColor();
          }
          this.context.fillRect(x + 1, y + 1, 8, 8);
          this.blocks[x + ":" + y] = {x: x, y: y};
        }
      }

      getRandomColor() {
        let letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
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
          this.config.maxX = this.elements.input.columns.value * 10;
          this.config.maxY = this.elements.input.rows.value * 10;

          let interval = setInterval(() => {
            this.findPotentialChilds();

            //If everybody died
            if (Object.keys(this.blocks).length == 0) {
              clearInterval(interval);
              //this.showStatistic();

              return false;
            }

            // let aliveCountLength = this.aliveCount.length;
            // //Last three counts are not identical (defence from loop)
            // if (this.aliveCount[aliveCountLength - 1] == this.aliveCount[aliveCountLength - 2]
            //   && this.aliveCount[aliveCountLength - 2] == this.aliveCount[aliveCountLength - 3]
            //   && aliveCountLength >= 2) {
            //   clearInterval(interval);
            //   this.showStatistic();
            //
            //   return false;
            // }

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
        this.toBorn = {};

        for (let coordinate in this.blocks) {
          if (this.blocks.hasOwnProperty(coordinate)) {
            const unit = this.blocks[coordinate];
            let neighbors = 0;
            let neighborUnits = this.getUnitsToCheck(unit);

            //Calculating a number of neighbors
            calculateNeighbors :for (let neighborKey in neighborUnits) {

              const neighbor = neighborUnits[neighborKey];
              const neighborCoordinate = neighbor.x + ":" + neighbor.y;

              if (this.blocks[neighborCoordinate] == undefined) {
                this.toBorn[neighborCoordinate] = {x: neighbor.x, y: neighbor.y};
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
       * Clears a list of child's which cannot be because of death of there parents
       */
      filterBorned() {
        if (this.config.clearChilds) {
          for (let unitCoordinate in this.toBorn) {
            if (this.toBorn.hasOwnProperty(unitCoordinate)) {
              const unit = this.toBorn[unitCoordinate];
              let parents = 0;
              let neighborUnits = this.getUnitsToCheck(unit);

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
                delete this.toBorn[unitCoordinate];
              }
            }
          }
        }
      }

      /**
       * Returns an array of units to check on exist
       * @param   {object} unit Unit around whom we must check
       * @returns {Array}  Array of units to check
       */
      getUnitsToCheck(unit) {
        let units = [];
        if (unit.y - 10 >= 0) {
          units.push({x: unit.x, y: unit.y - 10});

          if (unit.x - 10 >= 0) {
            units.push({x: unit.x - 10, y: unit.y});
            units.push({x: unit.x - 10, y: unit.y - 10});
          }

          if (unit.x + 10 <= this.config.maxY) {
            units.push({x: unit.x + 10, y: unit.y - 10});
          }
        }

        if (unit.y + 10 <= this.config.maxY) {
          units.push({x: unit.x, y: unit.y + 10});

          if (unit.x + 10 <= this.config.maxY) {
            units.push({x: unit.x + 10, y: unit.y});
            units.push({x: unit.x + 10, y: unit.y + 10});
          }

          if (unit.x - 10 >= 0) {
            units.push({x: unit.x - 10, y: unit.y + 10});
          }
        }
        return units;
      }

      /**
       * Kills units, creates childs, updates info
       */
      nextGeneration() {
        this.borned += Object.keys(this.toBorn).length;
        this.population.push(Object.keys(this.blocks).length);

        //Killing
        for (let killCoordinate in this.toDie) {
          if (this.toDie.hasOwnProperty(killCoordinate)) {
            let unit = this.toDie[killCoordinate];
            this.context.clearRect(unit.x + 1, unit.y + 1, 8, 8);

            delete this.blocks[killCoordinate];
            delete this.toDie[killCoordinate];
          }
        }

        //Creating
        for (let createCoordinate in this.toBorn) {
          if (this.toBorn.hasOwnProperty(createCoordinate)) {
            let unit = this.toBorn[createCoordinate];
            this.createBlock(unit.x, unit.y);

            delete this.toBorn[createCoordinate];
            this.blocks[createCoordinate] = unit;
          }
        }

        this.generation++;
        this.aliveCount.push(Object.keys(this.blocks).length);
        this.updateInfo();
      }

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
       * Draws arrows and text for statistic
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
      generationTime: 300,
      //randomColor: true
    };
    new Life(config);

  });
})();