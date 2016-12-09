;(function () {

  'use strict';
  document.addEventListener('DOMContentLoaded', function () {

    class Life {

      constructor() {
        this.playground = document.getElementById("playground");
        this.context = this.playground.getContext('2d');
        this.header = document.getElementsByTagName("header")[0]
        this.info = document.getElementsByTagName("info")[0]
        this.canEdit = true;
        this.count_alive = [];
        this.population = [0];
        this.blocks = this.can_born = this.to_die = {};
        this.generation = this.borned = this.loneliness = this.overcrowding = 0;

        this.config = {
          headerToggle: document.querySelector(".toggle-header"),
          infoToggle: document.querySelector(".toggle-info"),
          createButton: document.getElementById("create"),
          closeMessageButton: document.getElementById("close_message"),
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

      /**
       * Bind toggle for right menu with config
       */
      bindHeaderToggle() {
        this.config.headerToggle.addEventListener('click', (e) => {
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
       */
      bindConfigToggle() {
        this.config.infoToggle.addEventListener('click', (e) => {
          let icon = e.target.classList.contains('glyphicon') ? e.target : e.target.firstChild;

          icon.classList.toggle("glyphicon-eye-close");
          icon.classList.toggle("glyphicon-eye-open");
          this.info.classList.toggle("mini");
        });

        return this;
      }

      /**
       * Binds create, closeMessage, autoGenerate, playground, start buttons eventListeners
       */
      bindButtons() {
        this.config.createButton.addEventListener('click', () => {
          this.canEdit = false;
          this.create();
        });

        this.config.closeMessageButton.addEventListener('click', () => this.closeMessage());
        this.config.autoGenerateButton.addEventListener('click', () => this.autoGenerate());

        this.playground.addEventListener('mousedown', () => {
          this.canEdit = true;
          this.createElements();
        });

        this.playground.addEventListener('mouseup', () => {
          this.canEdit = false;
        });

        let i = 0;
        let list = this.config.startButtons;
        let listLength = list.length;
        for (i; i < listLength; i++) {
          list[i].addEventListener('click', () => this.start());
        }
      }

      /**
       * Creates a playground
       */
      create() {
        this.canEdit = true;

        this.rows = this.config.rowsInput.value;
        this.columns = this.config.columnsInput.value;

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

        this.config.rowsInput.value = this.rows;
        this.config.columnsInput.value = this.columns;
        this.create();
        this.config.headerToggle.click();
      }

      /**
       * Creates an element
       */
      createElements() {
        this.playground.addEventListener('mousemove', (e) => {
          if (this.canEdit) {
            const x = Math.floor(e.x / 10) * 10 - 10;
            const y = Math.floor(e.y / 10) * 10 - 10;

            this.context.beginPath();
            this.context.fillRect(x, y, 10, 10);
            this.blocks[x + ":" + y] = {x: x, y: y};

            this.drawBorders(x, y);
            this.context.closePath();
          }
        });
      }

      /**
       * Redraws only 2 columns & rows near cursor coordinate
       * @param {int} x
       * @param {int} y
       */
      drawBorders(x, y) {
        //column
        this.context.moveTo(x + .5, y);
        this.context.lineTo(x + .5, y + 10.5);
        this.context.moveTo(x + 10.5, y + 10.5);
        this.context.lineTo(x + 10.5, y);

        //row
        this.context.moveTo(x, y + .5);
        this.context.lineTo(x + 10.5, y + .5);
        this.context.moveTo(x + 10.5, y + 10.5);
        this.context.lineTo(x, y + 10.5);

        this.context.stroke();
      }

      /**
       * Закрывает поле на редактирование
       * Запускает интервал созданяи новых поколений
       * @returns {boolean} false при конце игры
       */
      start() {
        this.canEdit = false;
        var that = this;
        var interval = setInterval(function () {
          that.findPotentialChilds();

          //Есть хоть один живой
          if (Object.keys(that.blocks).length == 0) {
            clearInterval(interval);
            that.showMessage("You died.");
            that.showStatistic();
            return false;
          }

          //Последние три не одинаковы
          if (that.count_alive[that.count_alive.length - 1] == that.count_alive[that.count_alive.length - 2]
            && that.count_alive[that.count_alive.length - 2] == that.count_alive[that.count_alive.length - 3]
            && that.count_alive.length >= 2) {
            clearInterval(interval);
            that.showMessage("It's a loop.");
            that.showStatistic();
            return false;
          }

          that.filterBorned();
          that.nextGeneration();
          that.drawGrid();
        }, 500);
      }

      /**
       * Отображает сообщение пользователю
       * @param {string} text Текст сообщения
       */
      showMessage(text) {
        document.querySelector(".modal-body p").textContent = text;
        this.config.modalBlock.style.display = "block";
        this.config.modalBlock.style.opacity = 1;
        this.config.modalBlock.style.backgroundColor = "rgba(0,0,0,.4)";
      }

      /**
       * Скрывает сообщение
       */
      closeMessage() {
        this.config.modalBlock.style.display = "none";
        this.config.modalBlock.style.opacity = 0;
        this.config.modalBlock.style.backgroundColor = "";
      }

      /**
       * Проходит по блокам и записывает всех потенциальных детей этого поколения а также тех, кто умрёт в этом поколении
       */
      findPotentialChilds() {
        this.to_die = {};
        this.can_born = {};

        for (var index in this.blocks) {
          var that = this;
          var coor = this.blocks[index];
          var neighbors = 0;

          //Координаты 8 соседей текущей клетки
          var coor_to_check = this.getCoorToCheck(coor);

          coor_to_check.forEach(function (el) {
            var name = el.x + ":" + el.y;
            if (that.blocks[name] == undefined) {
              that.can_born[name] = {x: el.x, y: el.y};
            }
            else {
              neighbors++;
            }
          });

          //Одиночество
          if (neighbors < 3) {
            this.to_die[index] = coor;
            this.loneliness++;
          }
          //Перенаселение
          else if (neighbors > 3) {
            this.to_die[index] = coor;
            this.overcrowding++;
          }
        }
      }

      /**
       * Очищает список детей от невозможныых
       */
      filterBorned() {
        var that = this;
        for (var index in this.can_born) {
          var coor = this.can_born[index];
          var parents = 0;

          //Координаты 8 соседей текущей клетки
          var coor_to_check = this.getCoorToCheck(coor);

          coor_to_check.forEach(function (el) {
            var name = el.x + ":" + el.y;
            if (that.blocks[name] != undefined) {
              parents++;
            }
          });
          //Не может родиться
          if (parents != 3) {
            delete this.can_born[index];
          }
        }
      }

      /**
       * Подбирает массив координата для поиска детей
       * @param   {object} coor объект координат
       * @returns {Array}  массив координат для поиска
       */
      getCoorToCheck(coor) {
        return [
          {x: coor.x, y: coor.y - 10},
          {x: coor.x, y: coor.y + 10},
          {x: coor.x - 10, y: coor.y},
          {x: coor.x - 10, y: coor.y - 10},
          {x: coor.x - 10, y: coor.y + 10},
          {x: coor.x + 10, y: coor.y},
          {x: coor.x + 10, y: coor.y - 10},
          {x: coor.x + 10, y: coor.y + 10},
        ];
      }

      /**
       * Убивает невыживших
       * Создаёт детей
       * Вызывает обновление инфы
       */
      nextGeneration() {
        this.borned += Object.keys(this.can_born).length;
        this.population.push(Object.keys(this.blocks).length);

        //Убиваем
        for (var index in this.to_die) {
          var coor = this.to_die[index];
          this.context.clearRect(coor.x, coor.y, 10, 10);

          delete this.blocks[index];
          delete this.to_die[index];
        }
        //Рождаем
        for (var index in this.can_born) {
          var coor = this.can_born[index];
          this.context.fillRect(coor.x, coor.y, 10, 10);

          delete this.can_born[index];
          this.blocks[index] = coor;
        }

        this.generation++;
        this.count_alive.push(Object.keys(this.blocks).length);
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
       * Вызывает отрисовку стрелочек
       * Рисует график популяции на поколение
       */
      showStatistic() {
        this.drawArrows();

        var x_step = (this.playground.width - 210) / this.population.length;
        var y_step = (this.playground.height - 60) / Math.max.apply(Math, this.population);
        var x = 0;
        var y = 0;
        var that = this;
        this.context.beginPath();

        this.context.moveTo(10, this.playground.height - 10);
        this.population.forEach(function (e) {
          y = that.playground.height - (e * y_step) - 10;
          that.context.lineTo(x + 10, y);
          x += x_step;
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

    new Life();

  });
})();