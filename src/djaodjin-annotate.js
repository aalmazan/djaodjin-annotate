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
  images: ['./750x800.png'],
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

function wrapText(drawingContext, text, x, y, maxWidth, lineHeight) {
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

function generateId(length) {
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


/**
 * Main class to handle annotations.
 * Instantiate this and run `instance.init()`.
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

  /**
   * Set initial class variables
   * @private
   */
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
    this.$el.append($(`<canvas id="${this.baseLayerId}"></canvas>`));
    this.$el.append($(`<canvas id="${this.drawingLayerId}"></canvas>`));
    this.baseCanvas = document.getElementById(this.baseLayerId);
    this.drawingCanvas = document.getElementById(this.drawingLayerId);
    this.baseContext = this.baseCanvas.getContext('2d');
    this.drawingContext = this.drawingCanvas.getContext('2d');
    this.baseContext.lineJoin = 'round';
    this.drawingContext.lineJoin = 'round';
  }

  /**
   * Set toolbox area if Bootstrap is being used.
   * @param classPosition1
   * @param classPosition2
   * @private
   */
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

  /**
   * Set default/unstyled version of toolbox
   * @private
   */
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

  addElements(newStoredElements, set, callback) {
    this.storedElement = newStoredElements;
    this.clear();
    this.redraw();
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
      id = generateId(10);
      while (self.selectBackgroundImage(id)) {
        id = generateId(10);
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
    $.each(this.options.images, (index, image) => {
      let set = false;
      if (index === 0) {
        set = true;
      }
      this.pushImage(image, set);
    });
  }

  selectBackgroundImage(id) {
    return $.grep(this.images, element => element.id === id)[0];
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
    self.img.crossOrigin = 'Anonymous';
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
    this.$tool.children('.annotate-redo').attr('disabled', this.storedUndo.length === 0);
    this.$tool.children('.annotate-undo').attr('disabled', this.storedElement.length === 0);
  }

  undoaction(event) {
    event.preventDefault();
    this.storedUndo.push(this.storedElement[this.storedElement.length - 1]);
    this.storedElement.pop();
    this.checkUndoRedo();
    this.clear();
    this.redraw();
  }

  redoaction(event) {
    event.preventDefault();
    this.storedElement.push(this.storedUndo[this.storedUndo.length - 1]);
    this.storedUndo.pop();
    this.checkUndoRedo();
    this.clear();
    this.redraw();
  }

  redraw() {
    // this.baseCanvas.width = this.baseCanvas.width;
    if (this.options.images) {
      this.baseContext.drawImage(
        this.img, 0, 0, this.currentWidth,
        this.currentHeight,
      );
    }
    if (this.storedElement.length === 0) {
      return;
    }
    // clear each stored line
    for (let i = 0; i < this.storedElement.length; i += 1) {
      const element = this.storedElement[i];

      switch (element.type) {
        case 'rectangle':
          this.drawRectangle(
            this.baseContext, element.fromx, element.fromy,
            element.tox, element.toy,
          );
          break;
        case 'arrow':
          this.drawArrow(
            this.baseContext, element.fromx, element.fromy,
            element.tox, element.toy,
          );
          break;
        case 'pen':
          for (let b = 0; b < element.points.length - 1; b += 1) {
            const fromx = element.points[b][0];
            const fromy = element.points[b][1];
            const tox = element.points[b + 1][0];
            const toy = element.points[b + 1][1];
            this.drawPen(this.baseContext, fromx, fromy, tox, toy);
          }
          break;
        case 'text':
          this.drawText(
            this.baseContext, element.text, element.fromx,
            element.fromy, element.maxwidth,
          );
          break;
        case 'circle':
          this.drawCircle(
            this.baseContext, element.fromx, element.fromy,
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
    context.beginPath();
    context.rect(x, y, w, h);
    context.fillStyle = 'transparent';
    context.fill();
    context.lineWidth = this.linewidth;
    context.strokeStyle = this.options.color;
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
    context.beginPath();
    context.moveTo(centerX + radiusX * Math.cos(0), centerY + radiusY * Math.sin(0));
    for (; a < pi2; a += step) {
      context.lineTo(centerX + radiusX * Math.cos(a), centerY + radiusY * Math.sin(a));
    }
    context.lineWidth = this.linewidth;
    context.strokeStyle = this.options.color;
    context.closePath();
    context.stroke();
  }

  drawArrow(context, x, y, w, h) {
    const angle = Math.atan2(h - y, w - x);
    context.beginPath();
    context.lineWidth = this.linewidth;
    context.moveTo(x, y);
    context.lineTo(w, h);
    context.moveTo(
      (w - this.linewidth * 5 * Math.cos(angle + Math.PI / 6)),
      (h - this.linewidth * 5 * Math.sin(angle + Math.PI / 6)),
    );
    context.lineTo(w, h);
    context.lineTo(
      (w - this.linewidth * 5 * Math.cos(angle - Math.PI / 6)),
      (h - this.linewidth * 5 * Math.sin(angle - Math.PI / 6)),
    );

    context.strokeStyle = this.options.color;
    context.stroke();
  }

  drawPen(context, fromx, fromy, tox, toy) {
    context.lineWidth = this.linewidth;
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.strokeStyle = this.options.color;
    context.stroke();
  }


  drawText(context, text, x, y, maxWidth) {
    context.font = `${this.fontsize} sans-serif`;
    context.textBaseline = 'top';
    context.fillStyle = this.options.color;
    wrapText(context, text, x + 3, y + 4, maxWidth, 25);
  }

  pushText() {
    const text = this.$textbox.val();
    this.$textbox.val('').hide();
    if (text) {
      this.storedElement.push({
        type: 'text',
        text,
        fromx: this.fromx,
        fromy: this.fromy,
        maxwidth: this.tox,
      });
      if (this.storedUndo.length > 0) {
        this.storedUndo = [];
      }
    }
    this.checkUndoRedo();
    this.redraw();
  }

  // Events
  selectTool(element) {
    this.options.type = element.data('tool');
    if (this.$textbox.is(':visible')) {
      this.pushText();
    }
  }

  annotatestart(event) {
    this.clicked = true;
    const offset = this.$el.offset();
    if (this.$textbox.is(':visible')) {
      const text = this.$textbox.val();
      this.$textbox.val('').hide();
      if (text !== '') {
        if (!this.tox) {
          this.tox = 100;
        }
        this.storedElement.push({
          type: 'text',
          text,
          fromx: (this.fromxText - offset.left) * this.compensationWidthRate,
          fromy: (this.fromyText - offset.top) * this.compensationWidthRate,
          maxwidth: this.tox,
        });
        if (this.storedUndo.length > 0) {
          this.storedUndo = [];
        }
      }
      this.checkUndoRedo();
      this.redraw();
      this.clear();
    }
    this.tox = null;
    this.toy = null;
    this.points = [];
    const pageX = event.pageX || event.originalEvent.touches[0].pageX;
    const pageY = event.pageY || event.originalEvent.touches[0].pageY;
    this.fromx = (pageX - offset.left) * this.compensationWidthRate;
    this.fromy = (pageY - offset.top) * this.compensationWidthRate;
    this.fromxText = pageX;
    this.fromyText = pageY;
    if (this.options.type === 'text') {
      this.$textbox.css({
        left: this.fromxText + 2,
        top: this.fromyText,
        width: 0,
        height: 0,
      }).show();
    }
    if (this.options.type === 'pen') {
      this.points.push([
        this.fromx,
        this.fromy,
      ]);
    }
  }

  annotatestop() {
    this.clicked = false;
    if (this.toy !== null && this.tox !== null) {
      switch (this.options.type) {
        case 'rectangle':
          this.storedElement.push({
            type: 'rectangle',
            fromx: this.fromx,
            fromy: this.fromy,
            tox: this.tox,
            toy: this.toy,
          });
          break;
        case 'circle':
          this.storedElement.push({
            type: 'circle',
            fromx: this.fromx,
            fromy: this.fromy,
            tox: this.tox,
            toy: this.toy,
          });
          break;
        case 'arrow':
          this.storedElement.push({
            type: 'arrow',
            fromx: this.fromx,
            fromy: this.fromy,
            tox: this.tox,
            toy: this.toy,
          });
          break;
        case 'text':
          this.$textbox.css({
            left: this.fromxText + 2,
            top: this.fromyText,
            width: this.tox - 12,
            height: this.toy,
          });
          break;
        case 'pen':
          this.storedElement.push({
            type: 'pen',
            points: this.points,
          });
          for (let i = 0; i < this.points.length - 1; i += 1) {
            [this.fromx, this.fromy] = this.points[i];
            [this.tox, this.toy] = this.points[i + 1];
            this.drawPen(this.baseContext, this.fromx, this.fromy, this.tox, this.toy);
          }
          this.points = [];
          break;
        default:
      }
      if (this.storedUndo.length > 0) {
        this.storedUndo = [];
      }
      this.checkUndoRedo();
      this.redraw();
    } else if (this.options.type === 'text') {
      this.$textbox.css({
        left: this.fromxText + 2,
        top: this.fromyText,
        width: 100,
        height: 50,
      });
    }
  }

  annotateleave(event) {
    if (this.clicked) {
      this.annotatestop(event);
    }
  }

  annotatemove(event) {
    const offset = this.$el.offset();
    const pageX = event.pageX || event.originalEvent.touches[0].pageX;
    const pageY = event.pageY || event.originalEvent.touches[0].pageY;

    if (this.options.type) {
      event.preventDefault();
    }

    if (!this.clicked) {
      return;
    }

    switch (this.options.type) {
      case 'rectangle':
        this.clear();
        this.tox = (pageX - offset.left) * this.compensationWidthRate - this.fromx;
        this.toy = (pageY - offset.top) * this.compensationWidthRate - this.fromy;
        this.drawRectangle(this.drawingContext, this.fromx, this.fromy, this.tox, this.toy);
        break;
      case 'arrow':
        this.clear();
        this.tox = (pageX - offset.left) * this.compensationWidthRate;
        this.toy = (pageY - offset.top) * this.compensationWidthRate;
        this.drawArrow(
          this.drawingContext, this.fromx, this.fromy,
          this.tox,
          this.toy,
        );
        break;
      case 'pen':
        this.tox = (pageX - offset.left) * this.compensationWidthRate;
        this.toy = (pageY - offset.top) * this.compensationWidthRate;
        [this.fromx, this.fromy] = this.points[this.points.length - 1];
        this.points.push([
          this.tox,
          this.toy,
        ]);
        this.drawPen(
          this.drawingContext, this.fromx, this.fromy, this.tox,
          this.toy,
        );
        break;
      case 'text':
        this.clear();
        this.tox = (pageX - this.fromxText) * this.compensationWidthRate;
        this.toy = (pageY - this.fromyText) * this.compensationWidthRate;
        this.$textbox.css({
          left: this.fromxText + 2,
          top: this.fromyText,
          width: this.tox - 12,
          height: this.toy,
        });
        break;
      case 'circle':
        this.clear();
        this.tox = (pageX - offset.left) * this.compensationWidthRate;
        this.toy = (pageY - offset.top) * this.compensationWidthRate;
        this.drawCircle(this.drawingContext, this.fromx, this.fromy, this.tox, this.toy);
        break;
      default:
    }
  }

  annotateresize() {
    const currentWidth = this.$el.width();
    const currentcompensationWidthRate = this.compensationWidthRate;
    this.compensationWidthRate = this.selectImageSize.width / currentWidth;
    if (this.compensationWidthRate < 1) {
      this.compensationWidthRate = 1;
    }
    this.linewidth = this.options.linewidth * this.compensationWidthRate;
    this.fontsize = `${String(parseInt(this.options.fontsize.split('px')[0], 10) * this.compensationWidthRate)}px`;
    if (currentcompensationWidthRate !== this.compensationWidthRate) {
      this.redraw();
      this.clear();
    }
  }

  destroy() {
    $(document).off(this.options.selectEvent, '.annotate-image-select');
    this.$tool.remove();
    this.$textbox.remove();
    this.$el.children('canvas').remove();
    this.$el.removeData('annotate');
  }

  exportImage(options, callback) {
    const exportDefaults = {
      type: 'image/jpeg',
      quality: 0.75,
    };

    if (this.$textbox.is(':visible')) {
      this.pushText();
    }

    const opts = $.extend({}, exportDefaults, options);
    const image = this.baseCanvas.toDataURL(opts.type, opts.quality);

    if (callback) {
      callback(image);
    }
    this.options.onExport(image);
  }
}

