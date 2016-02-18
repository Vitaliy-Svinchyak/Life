'use strict';
document.addEventListener('DOMContentLoaded', function() {
    
    class Life {
        
        constructor() {
            this.playground     =   document.getElementById("playground");
            this.context        =   playground.getContext('2d');
            this.header         =   document.getElementsByTagName("header")[0]
            this.info         =   document.getElementsByTagName("info")[0]
            this.can_edit       =   true;
            this.count_alive    =   [];
            this.population     =   [0];
            this.blocks = this.can_born = this.to_die = this.childs = this.corpses = {};
            this.generation = this.borned = this.loneliness = this.overcrowding = 0;

            var that = this;

            //Анимация настроек
            document.querySelector(".toggle-header").onclick = function(){
                var icon = this.lastChild;
                var open = icon.classList.contains("glyphicon-eye-open");

                if(open){
                    icon.classList.add("glyphicon-eye-close");
                    icon.classList.remove("glyphicon-eye-open");
                    that.header.style.right = 0;
                }
                else{
                    icon.classList.add("glyphicon-eye-open");
                    icon.classList.remove("glyphicon-eye-close");
                    that.header.style.right = "-300px";
                }
            };  
            //Анимация инфы
            document.querySelector(".toggle-info").onclick = function(){
                var icon = this.lastChild;
                icon.classList.toggle("glyphicon-eye-close");
                icon.classList.toggle("glyphicon-eye-open");
                that.info.classList.toggle("mini");
            };  
            //Кнопка создать
            document.getElementById("create").onclick = function(){
                document.getElementById("playground").onmousemove = null;
                that.create();
            }; 
            //Кнопка закрыть сообщение
            document.getElementById("close_message").onclick = function(){
                that.closeMessage();
            };
            //Кнопка автогенерации
            document.getElementById("auto").onclick = function(){
                that.autoGenerate();
            };
            //Биндим создание клеток
            this.playground.onmousedown = function(){
                that.createElements();
            };
            //Анбиндим создание клеток
            this.playground.onmouseup = function(){
                that.playground.onmousemove = false;
            };
            
            //Кнопки начать
            var list = document.getElementsByClassName("play");
            for (var i = 0; i < list.length; i++) {
                list[i].onclick = function(){
                    that.start();
                }; 
            }
        }

        /**
         * Вытскивает параметры поля, 
         * Устанавливает размеры canvas
         * Вызывает отрисовку сетки
         */
        create (){
            this.can_edit = true;
            this.rows = document.getElementById("rows").value;
            this.columns = document.getElementById("columns").value;

            this.playground.style.display = "block";
            this.playground.width  = this.columns * 10;
            this.playground.height = this.rows * 10;

            this.drawGrid();
        }

        /**
         * Рисует сетку
         */
        drawGrid(){
            //Столбец
            for (var x = 0.5; x <=  this.playground.width; x += 10) {
                this.context.moveTo(x, 0);
                this.context.lineTo(x, this.playground.height);
            }
            //Строка
            for(var y = 0.5; y <=  this.playground.height; y += 10) {
                this.context.moveTo(0, y);
                this.context.lineTo(this.playground.width, y);
            }
            this.context.strokeStyle = "#eee";
            this.context.stroke();
        }

        /**
         * Выщитывает количество строк и  столбцов исходя из размеров экрана
         * Заполняет поля формы
         * Вызывает создание
         */
        autoGenerate(){
            this.columns = Math.floor((window.innerWidth - 25) / 10);
            this.rows = Math.floor((window.innerHeight - 25) / 10);

            document.getElementById("rows").value = this.rows;
            document.getElementById("columns").value = this.columns;
            this.create();
            document.querySelector(".toggle-header").click();
        }
        
        /**
         * По координатам мыши выщитывает расположение и рисует клетки
         */
        createElements(){
            var that = this;
            if(this.can_edit){
                this.playground.onmousemove = function(e){
                    var x = Math.floor(e.x / 10) * 10 - 10;
                    var y = Math.floor(e.y / 10) * 10  - 10;
                    that.context.fillRect(x, y, 10, 10);
                    that.blocks[x + ":" + y] = {x:x, y:y};
                    that.drowBorders(x, y);
                }
            }
        }

        /**
         * Рисует границы вокруг переданнной клетки
         * @param {number} x координата клетки
         * @param {number} y координата клетки
         */
        drowBorders(x, y){
            this.context.moveTo(x + .5, 0);
            this.context.lineTo(x + .5, this.playground.height);
            this.context.moveTo(x + 10.5, 0);
            this.context.lineTo(x + 10.5, this.playground.height);

            this.context.moveTo(0, y  + .5);
            this.context.lineTo(this.playground.width, y + .5);
            this.context.moveTo(0, y  + 10.5);
            this.context.lineTo(this.playground.width, y + 10.5);

            this.context.strokeStyle = "#eee";
            this.context.stroke();
        }

        /**
         * Закрывает поле на редактирование
         * Запускает интервал созданяи новых поколений
         * @returns {boolean} false при конце игры
         */
        start(){
            this.can_edit = false;
            var that = this;
            var interval = setInterval(function(){
                that.findPotentialChilds();

                //Есть хоть один живой
                if(Object.keys(that.blocks).length == 0){
                    clearInterval(interval);
                    that.showMessage("You died.");
                    that.showStatistic();
                    return false;
                }
                
                //Последние три не одинаковы
                if(that.count_alive[ that.count_alive.length - 1] == that.count_alive[ that.count_alive.length - 2] 
                   && that.count_alive[ that.count_alive.length - 2] == that.count_alive[ that.count_alive.length - 3]
                   && that.count_alive.length >= 2){
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
        showMessage(text){
            document.querySelector(".modal-body p").textContent = text;
            document.getElementById("myModal").style.display = "block";
            document.getElementById("myModal").style.opacity =  1;
            document.getElementById("myModal").style.backgroundColor =  "rgba(0,0,0,.4)";
        }

        /**
         * Скрывает сообщение
         */
        closeMessage(){
            document.getElementById("myModal").style.display = "none";
            document.getElementById("myModal").style.opacity =  0;
            document.getElementById("myModal").style.backgroundColor =  "";
        }

        /**
         * Проходит по блокам и записывает всех потенциальных детей этого поколения а также тех, кто умрёт в этом поколении
         */
        findPotentialChilds(){
            this.to_die = {};
            this.can_born = {};

            for(var index in this.blocks) {
                var that = this;
                var coor = this.blocks[index];
                var neighbors = 0;
                
                //Координаты 8 соседей текущей клетки
                var coor_to_check = this.getCoorToCheck(coor);

                coor_to_check.forEach(function(el){
                    var name = el.x + ":" + el.y;
                    if(that.blocks[name] == undefined){
                        that.can_born[name] = {x: el.x, y:el.y};
                    }
                    else{
                        neighbors++;
                    }
                });
                
                //Одиночество
                if(neighbors < 3){
                    this.to_die[index] = coor;
                    this.loneliness++;
                }
                //Перенаселение
                else if(neighbors > 3){
                    this.to_die[index] = coor;
                    this.overcrowding++;
                }
            }
        }

        /**
         * Очищает список детей от невозможныых
         */
        filterBorned(){
            var that = this;
            for(var index in this.can_born) { 
                var coor = this.can_born[index];
                var parents = 0;
                
                //Координаты 8 соседей текущей клетки
                var coor_to_check = this.getCoorToCheck(coor);

                coor_to_check.forEach(function(el){
                    var name = el.x + ":" + el.y;
                    if(that.blocks[name] != undefined){
                         parents++;
                    }
                });
                //Не может родиться
                if(parents != 3){
                    delete this.can_born[index];
                }
            }
        }
        
        /**
         * Подбирает массив координата для поиска детей
         * @param   {object} coor объект координат
         * @returns {Array}  массив координат для поиска
         */
        getCoorToCheck(coor){
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
        nextGeneration(){
            this.borned += Object.keys(this.can_born).length;
            this.population.push(Object.keys(this.blocks).length);

            //Убиваем
            for(var index in this.to_die) { 
                var coor = this.to_die[index];
                this.context.clearRect(coor.x, coor.y, 10, 10);

                delete this.blocks[index];
                delete this.to_die[index];
            }
            //Рождаем
            for(var index in this.can_born) { 
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
        updateInfo(){
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
        showStatistic(){
            this.drowArrows();

            var x_step = (this.playground.width - 210) / this.population.length;
            var y_step = (this.playground.height - 60) / Math.max.apply(Math, this.population);
            var x = 0;
            var y = 0;
            var that = this;
            this.context.beginPath();

            this.context.moveTo(10, this.playground.height - 10);
            this.population.forEach(function(e){
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
        drowArrows(){
            this.context.clearRect(0, 0, this.playground.width, this.playground.height);

            this.context.font = "italic 14pt Arial";

            this.context.beginPath();
            //Нижняя левая
            this.context.moveTo(0, this.playground.height - 10);
            this.context.lineTo(this.playground.width / 2 - 30, this.playground.height - 10);
            //Текст
            this.context.fillText("Generation", this.playground.width / 2 - 25, this.playground.height - 5);
            //Нижняя правая
            this.context.moveTo(this.playground.width / 2 + 80, this.playground.height - 10);
            this.context.lineTo(this.playground.width - 200, this.playground.height - 10);
            //Нижняя стрелочка
            this.context.lineTo(this.playground.width - 205, this.playground.height - 15);
            this.context.moveTo(this.playground.width - 200, this.playground.height - 10);
            this.context.lineTo(this.playground.width - 205, this.playground.height - 5);

            //Левая нижняя
            this.context.moveTo(10, this.playground.height);
            this.context.lineTo(10, this.playground.height / 2);
            //Текст
            this.context.fillText("Population", 5, this.playground.height / 2 - 10);
            //Левая верхняя
            this.context.moveTo(10, this.playground.height / 2 - 30);
            this.context.lineTo(10, 50);
            //Левая стрелочка
            this.context.lineTo(15, 55);
            this.context.moveTo(10, 50);
            this.context.lineTo(5, 55);

            this.context.strokeStyle = "#000";
            this.context.stroke();
         }
    
    }
    var game = new Life();
    
});