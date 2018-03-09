import $ from 'jquery';
import annotate from './djaodjin-annotate';

document.addEventListener('DOMContentLoaded', () => {
  const Annotate = new annotate($('#myCanvas'));
  Annotate.init();

  // Handle export button click
  $('.export-image').click(() => {
    Annotate.exportImage({}, (image) => {
      $('img#exported').attr('src', image);
    });
  });

});
