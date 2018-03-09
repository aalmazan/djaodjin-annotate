/*
djaodjin-annotate.js v0.0.4
Copyright (c) 2015, Djaodjin Inc.
MIT License
*/


import $ from 'jquery';

const OPTIONS = {
  width: null,
  height: null,
  // images: [],
  images: ['./350x150.png'],
  color: 'red',
  type: 'rectangle',
  linewidth: 2,
  fontsize: '20px',
  bootstrap: false,
  position: 'top',
  idAttribute: 'id',
  selectEvent: 'change',
  unselectTool: false,
  onExport(image) {
    console.log(image);
  },
};

/**
 * Function to annotate the image
 * @param {[type]} el      [description]
 * @param {Object} options [description]
 */
export default class Annotate {
  constructor(el, options) {
    this.options = OPTIONS;
    this.$el = $(el);
    this.clicked = false;
    this.fromx = null;
    this.fromy = null;
    this.fromxText = null;
    this.fromyText = null;
    this.tox = null;
    this.toy = null;
    this.points = [];
    this.storedUndo = [];
    this.storedElement = [];
    this.images = [];
    this.img = null;
    this.selectedImage = null;
    this.currentWidth = null;
    this.currentHeight = null;
    this.selectImageSize = {};
    this.compensationWidthRate = 1;
    this.linewidth = 1;
    this.fontsize = 1;
  }

  _setVars() {
    this.linewidth = this.options.linewidth;
    this.fontsize = this.options.fontsize;
    this.$el.addClass('annotate-container');
    this.$el.css({
      cursor: 'crosshair',
    });
    this.baseLayerId = `baseLayer_${this.$el.attr('id')}`;
    this.drawingLayerId = `drawingLayer_${this.$el.attr('id')}`;
    this.toolOptionId = `tool_option_${this.$el.attr('id')}`;
    console.log(this.toolOptionId);
    this.$el.append($(`<canvas id="${this.baseLayerId}"></canvas>`));
    this.$el.append($(`<canvas id="${this.drawingLayerId}"></canvas>`));
    this.baseCanvas = document.getElementById(this.baseLayerId);
    this.drawingCanvas = document.getElementById(this.drawingLayerId);
    this.baseContext = this.baseCanvas.getContext('2d');
    this.drawingContext = this.drawingCanvas.getContext('2d');
    this.baseContext.lineJoin = 'round';
    this.drawingContext.lineJoin = 'round';
  }

  _setBootstrap(classPosition1, classPosition2) {
    this.$tool = `${'<div id="">' +
      '<button id="undoaction" title="Undo the last annotation"' +
      ' class="btn btn-primary '}${classPosition2} annotate-undo">` +
      '<i class="glyphicon glyphicon-arrow-left"></i></button>' +
      `<div class="${classPosition1}" data-toggle="buttons">`;
    if (this.options.unselectTool) {
      this.$tool += `<label class="btn btn-danger active"><input type="radio" name="${this.toolOptionId}" ` +
        'data-tool="null" data-toggle="tooltip" data-placement="top" ' +
        'title="No tool selected"><i class="glyphicon glyphicon-ban-circle"></i></label>';
    }
    this.$tool += `${'<label class="btn btn-primary active">' +
      '<input type="radio" name="'}${this.toolOptionId}" data-tool="rectangle"` +
      ' data-toggle="tooltip" data-placement="top" title="Draw an rectangle">' +
      '<i class="glyphicon glyphicon-unchecked"></i></label><label class="btn btn-primary">' +
      `<input type="radio" name="${this.toolOptionId}" data-tool="circle"` +
      ' data-toggle="tooltip" data-placement="top" title="Write some text">' +
      '<i class="glyphicon glyphicon-copyright-mark"></i></label><label class="btn btn-primary">' +
      `<input type="radio" name="${this.toolOptionId}" data-tool="text" data-toggle="tooltip" ` +
      'data-placement="top" title="Write some text">' +
      '<i class="glyphicon glyphicon-font"></i></label>' +
      '<label class="btn btn-primary">' +
      `<input type="radio" name="${this.toolOptionId}" data-tool="arrow"` +
      ' data-toggle="tooltip" data-placement="top" title="Draw an arrow">' +
      '<i class="glyphicon glyphicon-arrow-up"></i></label>' +
      '<label class="btn btn-primary">' +
      `<input type="radio" name="${this.toolOptionId}" data-tool="pen"` +
      ' data-toggle="tooltip" data-placement="top" title="Pen Tool">' +
      '<i class="glyphicon glyphicon-pencil"></i></label>' +
      '</div><button type="button" id="redoaction"' +
      ' title="Redo the last undone annotation" ' +
      `class="btn btn-primary ${classPosition2} annotate-redo">` +
      '<i class="glyphicon glyphicon-arrow-right"></i></button>' +
      '</div>';
  }

  _setNonBootstrap() {
    this.$tool = '<div id="annotate-toolbox" style="display:inline-block"><button id="undoaction">UNDO</button>';
    if (this.options.unselectTool) {
      this.$tool += `<input type="radio" name="${this.toolOptionId}" data-tool="null">NO TOOL SELECTED`;
    }
    this.$tool += `<input type="radio" name="${this.toolOptionId}" data-tool="rectangle" checked>RECTANGLE` +
      `<input type="radio" name="${this.toolOptionId}" data-tool="circle">CIRCLE` +
      `<input type="radio" name="${this.toolOptionId}" data-tool="text"> TEXT` +
      `<input type="radio" name="${this.toolOptionId}" data-tool="arrow">ARROW` +
      `<input type="radio" name="${this.toolOptionId}" data-tool="pen">PEN` +
      '<button id="redoaction" title="Redo the last undone annotation">REDO</button>' +
      '</div>';
  }

  _setCanvasPosition(canvasPosition) {
    const isTop = this.options.position === 'top';
    const isLeft = this.options.position === 'left';
    const isRight = this.options.position === 'right';
    const isBottom = this.options.position === 'bottom';

    if (isTop || (!isTop && !this.options.bootstrap)) {
      this.$tool.css({
        position: 'absolute',
        top: -35,
        left: canvasPosition.left,
      });
    } else if (isLeft && this.options.bootstrap) {
      this.$tool.css({
        position: 'absolute',
        top: canvasPosition.top - 35,
        left: canvasPosition.left - 20,
      });
    } else if (isRight && this.options.bootstrap) {
      this.$tool.css({
        position: 'absolute',
        top: canvasPosition.top - 35,
        left: canvasPosition.left + this.baseCanvas.width + 20,
      });
    } else if (isBottom && this.options.bootstrap) {
      this.$tool.css({
        position: 'absolute',
        top: canvasPosition.top + this.baseCanvas.height + 35,
        left: canvasPosition.left,
      });
    }
  }

  init() {
    const self = this;

    this._setVars();

    let classPosition1 = 'btn-group';
    let classPosition2 = '';
    if (self.options.position === 'left' || self.options.position === 'right') {
      classPosition1 = 'btn-group-vertical';
      classPosition2 = 'btn-block';
    }

    if (self.options.bootstrap) {
      this._setBootstrap(classPosition1, classPosition2);
    } else {
      this._setNonBootstrap();
    }

    this.$tool = $(this.$tool);
    console.log(this.$tool);
    $('.annotate-container').append(this.$tool);

    this._setCanvasPosition(this.$el.offset());

    this.$textbox = $(`<textarea id="" class="annotate-textarea" 
      style="font-size:${this.fontsize};color:${this.options.color};"></textarea>`);

    $('body').append(this.$textbox);
    if (self.options.images) {
      self.initBackgroundImages();
    } else {
      if (!self.options.width && !self.options.height) {
        self.options.width = 640;
        self.options.height = 480;
      }

      self.baseCanvas.width = self.options.width;
      self.drawingCanvas.width = self.options.width;

      self.baseCanvas.height = self.options.height;
      self.drawingCanvas.height = self.options.height;
    }

    this.$tool.on('change', 'input[name^="tool_option"]', (event) => {
      self.selectTool($(event.currentTarget));
    });

    $(`[data-tool="${self.options.type}"]`).trigger('click');
    this.$tool.on('click', '.annotate-redo', (event) => {
      self.redoaction(event);
    });

    this.$tool.on('click', '.annotate-undo', (event) => {
      self.undoaction(event);
    });

    $(document).on(
      self.options.selectEvent, '.annotate-image-select',
      (event) => {
        event.preventDefault();
        const image = self.selectBackgroundImage($(this).attr(self.options.idAttribute));
        self.setBackgroundImage(image);
      },
    );

    const $drawingLayer = $(`#${self.drawingLayerId}`);
    $drawingLayer.on('mousedown touchstart', (event) => {
      self.annotatestart(event);
    });
    $drawingLayer.on('mouseup touchend', (event) => {
      self.annotatestop(event);
    });

    // https://developer.mozilla.org/en-US/docs/Web/Events/touchleave
    $drawingLayer.on('mouseleave touchleave', (event) => {
      self.annotateleave(event);
    });

    $drawingLayer.on('mousemove touchmove', (event) => {
      self.annotatemove(event);
    });

    $(window).on('resize', () => {
      self.annotateresize();
    });

    self.checkUndoRedo();
  }

  generateId(length) {
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
    const charsLen = chars.length;
    const useLength = length || Math.floor(Math.random() * charsLen);

    let str = '';
    for (let i = 0; i < useLength; i += 1) {
      str += chars[Math.floor(Math.random() * charsLen)];
    }
    return str;
  }

  addElements(newStoredElements, set, callback) {
    const self = this;
    this.storedElement = newStoredElements;
    self.clear();
    self.redraw();
  }

  pushImage(newImage, set, callback) {
    const self = this;
    let id = null;
    let path = null;
    if (typeof newImage === 'object') {
      ({ id, path } = newImage);
    } else {
      id = newImage;
      path = newImage;
    }
    if (id === '' || typeof id === 'undefined' || self.selectBackgroundImage(id)) {
      id = self.generateId(10);
      while (self.selectBackgroundImage(id)) {
        id = self.generateId(10);
      }
    }
    const image = {
      id,
      path,
      storedUndo: [],
      storedElement: [],
    };
    self.images.push(image);
    if (set) {
      self.setBackgroundImage(image);
    }
    if (callback) {
      callback({
        id: image.id,
        path: image.path,
      });
    }
    self.$el.trigger('annotate-image-added', [
      image.id,
      image.path,
    ]);
  }

  initBackgroundImages() {
    const self = this;
    $.each(self.options.images, (index, image) => {
      let set = false;
      if (index === 0) {
        set = true;
      }
      self.pushImage(image, set);
    });
  }

  selectBackgroundImage(id) {
    const self = this;
    const image = $.grep(self.images, element => element.id === id)[0];
    return image;
  }

  setBackgroundImage(image) {
    const self = this;
    if (self.$textbox.is(':visible')) {
      self.pushText();
    }
    const currentImage = self.selectBackgroundImage(self.selectedImage);
    if (currentImage) {
      currentImage.storedElement = self.storedElement;
      currentImage.storedUndo = self.storedUndo;
    }
    self.img = new Image();
    self.img.src = image.path;
    self.img.onload = function () {
      if ((self.options.width && self.options.height) !== undefined ||
        (self.options.width && self.options.height) !== 0) {
        self.currentWidth = this.width;
        self.currentHeight = this.height;
        self.selectImageSize.width = this.width;
        self.selectImageSize.height = this.height;
      } else {
        self.currentWidth = self.options.width;
        self.currentHeight = self.options.height;
      }
      self.baseCanvas.width = self.drawingCanvas.width = self.currentWidth;
      self.baseCanvas.height = self.drawingCanvas.height = self.currentHeight;
      self.baseContext.drawImage(
        self.img, 0, 0, self.currentWidth,
        self.currentHeight,
      );
      self.$el.css({
        height: self.currentHeight,
        width: self.currentWidth,
      });
      self.storedElement = image.storedElement;
      self.storedUndo = image.storedUndo;
      self.selectedImage = image.id;
      self.checkUndoRedo();
      self.clear();
      self.redraw();
      self.annotateresize();
    };
  }

  checkUndoRedo() {
    const self = this;
    self.$tool.children('.annotate-redo').attr('disabled', self.storedUndo
      .length === 0);
    self.$tool.children('.annotate-undo').attr('disabled', self.storedElement
      .length === 0);
  }

  undoaction(event) {
    event.preventDefault();
    const self = this;
    self.storedUndo.push(self.storedElement[self.storedElement.length -
    1]);
    self.storedElement.pop();
    self.checkUndoRedo();
    self.clear();
    self.redraw();
  }

  redoaction(event) {
    event.preventDefault();
    const self = this;
    self.storedElement.push(self.storedUndo[self.storedUndo.length - 1]);
    self.storedUndo.pop();
    self.checkUndoRedo();
    self.clear();
    self.redraw();
  }

  redraw() {
    const self = this;
    self.baseCanvas.width = self.baseCanvas.width;
    if (self.options.images) {
      self.baseContext.drawImage(
        self.img, 0, 0, self.currentWidth,
        self.currentHeight,
      );
    }
    if (self.storedElement.length === 0) {
      return;
    }
    // clear each stored line
    for (let i = 0; i < self.storedElement.length; i++) {
      const element = self.storedElement[i];

      switch (element.type) {
        case 'rectangle':
          self.drawRectangle(
            self.baseContext, element.fromx, element.fromy,
            element.tox, element.toy,
          );
          break;
        case 'arrow':
          self.drawArrow(
            self.baseContext, element.fromx, element.fromy,
            element.tox, element.toy,
          );
          break;
        case 'pen':
          for (let b = 0; b < element.points.length - 1; b++) {
            const fromx = element.points[b][0];
            const fromy = element.points[b][1];
            const tox = element.points[b + 1][0];
            const toy = element.points[b + 1][1];
            self.drawPen(self.baseContext, fromx, fromy, tox, toy);
          }
          break;
        case 'text':
          self.drawText(
            self.baseContext, element.text, element.fromx,
            element.fromy, element.maxwidth,
          );
          break;
        case 'circle':
          self.drawCircle(
            self.baseContext, element.fromx, element.fromy,
            element.tox, element.toy,
          );
          break;
        default:
      }
    }
  }

  clear() {
    const self = this;
    // Clear Canvas
    self.drawingCanvas.width = self.drawingCanvas.width;
  }

  drawRectangle(context, x, y, w, h) {
    const self = this;
    context.beginPath();
    context.rect(x, y, w, h);
    context.fillStyle = 'transparent';
    context.fill();
    context.lineWidth = self.linewidth;
    context.strokeStyle = self.options.color;
    context.stroke();
  }

  drawCircle(context, x1, y1, x2, y2) {
    const radiusX = (x2 - x1) * 0.5;
    const radiusY = (y2 - y1) * 0.5;
    const centerX = x1 + radiusX;
    const centerY = y1 + radiusY;
    const step = 0.05;
    let a = step;
    const pi2 = Math.PI * 2 - step;
    const self = this;
    context.beginPath();
    context.moveTo(centerX + radiusX * Math.cos(0), centerY + radiusY *
      Math.sin(0));
    for (; a < pi2; a += step) {
      context.lineTo(centerX + radiusX * Math.cos(a), centerY + radiusY *
        Math.sin(a));
    }
    context.lineWidth = self.linewidth;
    context.strokeStyle = self.options.color;
    context.closePath();
    context.stroke();
  }

  drawArrow(context, x, y, w, h) {
    const self = this;
    const angle = Math.atan2(h - y, w - x);
    context.beginPath();
    context.lineWidth = self.linewidth;
    context.moveTo(x, y);
    context.lineTo(w, h);
    context.moveTo(
      (w - self.linewidth * 5 * Math.cos(angle + Math.PI / 6)),
      (h - self.linewidth * 5 * Math.sin(angle + Math.PI / 6)),
    );
    context.lineTo(w, h);
    context.lineTo(
      (w - self.linewidth * 5 * Math.cos(angle - Math.PI / 6)),
      (h - self.linewidth * 5 * Math.sin(angle - Math.PI / 6)),
    );

    context.strokeStyle = self.options.color;
    context.stroke();
  }

  drawPen(context, fromx, fromy, tox, toy) {
    const self = this;
    context.lineWidth = self.linewidth;
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.strokeStyle = self.options.color;
    context.stroke();
  }

  wrapText(drawingContext, text, x, y, maxWidth, lineHeight) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const words = lines[i].split(' ');
      let line = '';
      for (let n = 0; n < words.length; n += 1) {
        const testLine = `${line + words[n]} `;
        const metrics = drawingContext.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          drawingContext.fillText(line, x, y);
          line = `${words[n]} `;
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      drawingContext.fillText(line, x, y + i * lineHeight);
    }
  }

  drawText(context, text, x, y, maxWidth) {
    const self = this;
    context.font = `${self.fontsize} sans-serif`;
    context.textBaseline = 'top';
    context.fillStyle = self.options.color;
    self.wrapText(context, text, x + 3, y + 4, maxWidth, 25);
  }

  pushText() {
    const self = this;
    const text = self.$textbox.val();
    self.$textbox.val('').hide();
    if (text) {
      self.storedElement.push({
        type: 'text',
        text,
        fromx: self.fromx,
        fromy: self.fromy,
        maxwidth: self.tox,
      });
      if (self.storedUndo.length > 0) {
        self.storedUndo = [];
      }
    }
    self.checkUndoRedo();
    self.redraw();
  }

  // Events
  selectTool(element) {
    this.options.type = element.data('tool');
    if (this.$textbox.is(':visible')) {
      this.pushText();
    }
  }

  annotatestart(event) {
    const self = this;
    self.clicked = true;
    const offset = self.$el.offset();
    if (self.$textbox.is(':visible')) {
      const text = self.$textbox.val();
      self.$textbox.val('').hide();
      if (text !== '') {
        if (!self.tox) {
          self.tox = 100;
        }
        self.storedElement.push({
          type: 'text',
          text,
          fromx: (self.fromxText - offset.left) * self.compensationWidthRate,
          fromy: (self.fromyText - offset.top) * self.compensationWidthRate,
          maxwidth: self.tox,
        });
        if (self.storedUndo.length > 0) {
          self.storedUndo = [];
        }
      }
      self.checkUndoRedo();
      self.redraw();
      self.clear();
    }
    self.tox = null;
    self.toy = null;
    self.points = [];
    const pageX = event.pageX || event.originalEvent.touches[0].pageX;
    const pageY = event.pageY || event.originalEvent.touches[0].pageY;
    self.fromx = (pageX - offset.left) * self.compensationWidthRate;
    self.fromy = (pageY - offset.top) * self.compensationWidthRate;
    self.fromxText = pageX;
    self.fromyText = pageY;
    if (self.options.type === 'text') {
      self.$textbox.css({
        left: self.fromxText + 2,
        top: self.fromyText,
        width: 0,
        height: 0,
      }).show();
    }
    if (self.options.type === 'pen') {
      self.points.push([
        self.fromx,
        self.fromy,
      ]);
    }
  }

  annotatestop() {
    const self = this;
    self.clicked = false;
    if (self.toy !== null && self.tox !== null) {
      switch (self.options.type) {
        case 'rectangle':
          self.storedElement.push({
            type: 'rectangle',
            fromx: self.fromx,
            fromy: self.fromy,
            tox: self.tox,
            toy: self.toy,
          });
          break;
        case 'circle':
          self.storedElement.push({
            type: 'circle',
            fromx: self.fromx,
            fromy: self.fromy,
            tox: self.tox,
            toy: self.toy,
          });
          break;
        case 'arrow':
          self.storedElement.push({
            type: 'arrow',
            fromx: self.fromx,
            fromy: self.fromy,
            tox: self.tox,
            toy: self.toy,
          });
          break;
        case 'text':
          self.$textbox.css({
            left: self.fromxText + 2,
            top: self.fromyText,
            width: self.tox - 12,
            height: self.toy,
          });
          break;
        case 'pen':
          self.storedElement.push({
            type: 'pen',
            points: self.points,
          });
          for (let i = 0; i < self.points.length - 1; i++) {
            self.fromx = self.points[i][0];
            self.fromy = self.points[i][1];
            self.tox = self.points[i + 1][0];
            self.toy = self.points[i + 1][1];
            self.drawPen(
              self.baseContext, self.fromx, self.fromy, self
                .tox,
              self.toy,
            );
          }
          self.points = [];
          break;
        default:
      }
      if (self.storedUndo.length > 0) {
        self.storedUndo = [];
      }
      self.checkUndoRedo();
      self.redraw();
    } else if (self.options.type === 'text') {
      self.$textbox.css({
        left: self.fromxText + 2,
        top: self.fromyText,
        width: 100,
        height: 50,
      });
    }
  }

  annotateleave(event) {
    const self = this;
    if (self.clicked) {
      self.annotatestop(event);
    }
  }

  annotatemove(event) {
    const self = this;
    const offset = self.$el.offset();
    const pageX = event.pageX || event.originalEvent.touches[0].pageX;
    const pageY = event.pageY || event.originalEvent.touches[0].pageY;

    if (self.options.type) {
      event.preventDefault();
    }

    if (!self.clicked) {
      return;
    }

    switch (self.options.type) {
      case 'rectangle':
        self.clear();
        self.tox = (pageX - offset.left) * self.compensationWidthRate -
          self.fromx;
        self.toy = (pageY - offset.top) * self.compensationWidthRate -
          self.fromy;
        self.drawRectangle(
          self.drawingContext, self.fromx, self.fromy,
          self.tox, self.toy,
        );
        break;
      case 'arrow':
        self.clear();
        self.tox = (pageX - offset.left) * self.compensationWidthRate;
        self.toy = (pageY - offset.top) * self.compensationWidthRate;
        self.drawArrow(
          self.drawingContext, self.fromx, self.fromy,
          self.tox,
          self.toy,
        );
        break;
      case 'pen':
        self.tox = (pageX - offset.left) * self.compensationWidthRate;
        self.toy = (pageY - offset.top) * self.compensationWidthRate;
        self.fromx = self.points[self.points.length - 1][0];
        self.fromy = self.points[self.points.length - 1][1];
        self.points.push([
          self.tox,
          self.toy,
        ]);
        self.drawPen(
          self.drawingContext, self.fromx, self.fromy, self.tox,
          self.toy,
        );
        break;
      case 'text':
        self.clear();
        self.tox = (pageX - self.fromxText) * self.compensationWidthRate;
        self.toy = (pageY - self.fromyText) * self.compensationWidthRate;
        self.$textbox.css({
          left: self.fromxText + 2,
          top: self.fromyText,
          width: self.tox - 12,
          height: self.toy,
        });
        break;
      case 'circle':
        self.clear();
        self.tox = (pageX - offset.left) * self.compensationWidthRate;
        self.toy = (pageY - offset.top) * self.compensationWidthRate;
        self.drawCircle(
          self.drawingContext, self.fromx, self.fromy,
          self
            .tox, self.toy,
        );
        break;
      default:
    }
  }

  annotateresize() {
    const self = this;
    const currentWidth = self.$el.width();
    const currentcompensationWidthRate = self.compensationWidthRate;
    self.compensationWidthRate = self.selectImageSize.width / currentWidth;
    if (self.compensationWidthRate < 1) {
      self.compensationWidthRate = 1;
    }
    self.linewidth = self.options.linewidth * self.compensationWidthRate;
    self.fontsize = `${String(parseInt(self.options.fontsize.split('px')[0], 10) * self.compensationWidthRate)}px`;
    if (currentcompensationWidthRate !== self.compensationWidthRate) {
      self.redraw();
      self.clear();
    }
  }

  destroy() {
    const self = this;
    $(document).off(self.options.selectEvent, '.annotate-image-select');
    self.$tool.remove();
    self.$textbox.remove();
    self.$el.children('canvas').remove();
    self.$el.removeData('annotate');
  }

  exportImage(options, callback) {
    const self = this;
    const exportDefaults = {
      type: 'image/jpeg',
      quality: 0.75,
    };

    if (self.$textbox.is(':visible')) {
      self.pushText();
    }

    const opts = $.extend({}, exportDefaults, options);
    const image = self.baseCanvas.toDataURL(opts.type, opts.quality);

    if (callback) {
      callback(image);
    }
    self.options.onExport(image);
  }
}

$.fn.annotate = (options, cmdOption, callback) => {
  let $annotate = $(this).data('annotate');
  if (options === 'destroy') {
    if ($annotate) {
      $annotate.destroy();
    } else {
      throw new Error('No annotate initialized for: #' + $(this).attr(
        'id'));
    }
  } else if (options === 'push') {
    if ($annotate) {
      $annotate.pushImage(cmdOption, true, callback);
    } else {
      throw new Error('No annotate initialized for: #' + $(this).attr(
        'id'));
    }
  } else if (options === 'fill') {
    if ($annotate) {
      $annotate.addElements(cmdOption, true, callback);
    } else {
      throw new Error('No annotate initialized for: #' + $(this).attr(
        'id'));
    }
  } else if (options === 'export') {
    if ($annotate) {
      $annotate.exportImage(cmdOption, callback);
    } else {
      throw new Error('No annotate initialized for: #' + $(this).attr(
        'id'));
    }
  } else {
    let opts = $.extend({}, $.fn.annotate.defaults, options);
    let annotate = new Annotate($(this), opts);
    $(this).data('annotate', annotate);
  }
};

$.fn.annotate.defaults = {
  width: null,
  height: null,
  images: [],
  color: 'red',
  type: 'rectangle',
  linewidth: 2,
  fontsize: '20px',
  bootstrap: false,
  position: 'top',
  idAttribute: 'id',
  selectEvent: 'change',
  unselectTool: false,
  onExport(image) {
    console.log(image);
  }
};

