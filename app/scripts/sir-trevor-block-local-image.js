/*
  Sir Trevor Image block, which uses data-uri.
  Replaces the original image.
*/

SirTrevor.Blocks.OriginalImage = SirTrevor.Blocks.Image;

SirTrevor.Blocks.Image = SirTrevor.Block.extend({

  type: "image",
  title: function() { return i18n.t('blocks:image:title'); },

  droppable: true,
  uploadable: true,

  icon_name: 'image',

  loadData: function(data){
    // Create our image tag
    this.$editor.html($('<img>', { src: data.imageData }));
  },

  onBlockRender: function(){
    /* Setup the upload button */
    this.$inputs.find('button').bind('click', function(ev){ ev.preventDefault(); });
    this.$inputs.find('input').attr('accept', 'image/*');
    this.$inputs.find('input').on('change', _.bind(function(ev){
      this.onDrop(ev.currentTarget);
    }, this));
  },

  onDrop: function(transferData){
    var file = transferData.files[0],
        urlAPI = (typeof URL !== "undefined") ? URL : (typeof webkitURL !== "undefined") ? webkitURL : null;

    // Handle one upload at a time
    if (/image/.test(file.type)) {
      this.loading();
      // Show this image on here
      this.$inputs.hide();
      this.$editor.html($('<img>', { src: urlAPI.createObjectURL(file) })).show();

      var self = this;
      var reader = new FileReader();
      reader.addEventListener('loadend', function() {
        self.setData({imageData: reader.result});
        self.ready();
      });
      reader.addEventListener('error', function() {
        self.addMessage(i18n.t('blocks:image:upload_error'));
        self.ready();
      });
      reader.readAsDataURL(file);
    }
  }
});
