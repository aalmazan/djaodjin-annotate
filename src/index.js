import $ from 'jquery';
import annotate from './djaodjin-annotate';

// document.addEventListener('DOMContentLoaded', () => {
//   const annotate = new Annotate('#myCanvas');
//   annotate.init();
// });

function init() {
  const el = $('#myCanvas');
  const Annotate = new annotate(el);
  Annotate.init();

  // Export works
  const exportImage = $('.export-image').click(e => {
    Annotate.exportImage({}, (args) => {
      console.log(args);
    });
  });
}

init();
