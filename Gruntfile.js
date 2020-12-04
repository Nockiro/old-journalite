/*jshint camelcase: false*/

var path = require('path');

function userDir(dir) {
  var homepath = process.env[/^win/.test(process.platform) ? 'USERPROFILE' : 'HOME'];
  return path.resolve(homepath, dir);
}

function buildDir(subdir) {
  return userDir(path.join('build', 'journalite', subdir));
}

module.exports = function (grunt) {
  'use strict';

  // load all grunt tasks
  grunt.loadNpmTasks('grunt-node-webkit-builder');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-text-replace');

  grunt.initConfig({
    // configurable paths
    config: {
      app:     'app',
      dist:    buildDir('dist'),
      wininst: 'wininst',
      tmp:     '.tmp'
    },
    shell: {
      makensis: {
        options: { stdout: true, failOnError: true },
        command: 'makensis -DINSTALLERDIR=<%= config.dist %>/releases/Journalite/win -DFILESDIR=<%= config.dist %>/releases/Journalite/win/Journalite <%= config.wininst %>/script.nsi '
      }
    },
    clean: {
      tmp: {
        files: [{
          dot: true,
          src: [
            '<%= config.tmp %>/*',
            '.tmp/*'
          ]
        }]
      }
    },
    useminPrepare: {
      options: {
        dest: '<%= config.tmp %>/app'
      },
      html: '<%= config.app %>/index.html'
    },
    usemin: {
      options: {
        dirs: ['<%= config.tmp %>/app']
      },
      html: ['<%= config.tmp %>/app/index.html'],
      css: ['<%= config.tmp %>/app/css/{,*/}*.css']
    },
    cssmin: {
      //TODO
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= config.app %>',
          dest: '<%= config.tmp %>/app',
          src: [
            '*.{ico,png,json,html}',
            'img/{,*/}*.{webp,gif,svg,jpg,jpeg,png}',
            'fonts/{,*/}*.*',
            'templates/{,*/}*.*',
            'node_modules/{,*/}*.*',
          ]
        }]
      },
      credits: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= config.app %>',
          dest: '<%= config.dist %>/releases/Journalite/win/Journalite/',
          src: [
            'credits-app.txt',
          ]
        }]
      }
    },
    replace: {
      dist: {
        src: ['<%= config.app %>/package.json'],
        dest: '<%= config.tmp %>/app/package.json',
        replacements: [{
          from: '"toolbar": true',
          to: '"toolbar": false'
        }]
      }
    },
    nodewebkit: {
      options: {
        app_name: "Journalite",
        build_dir: '<%= config.dist %>', // Where the build version of my node-webkit app is saved
        version: '0.8.5',
        credits: true,
        mac: false,
        win: true,
        linux32: false,
        linux64: true
      },
      src: ['<%= config.tmp %>/app/**/*'] // Your node-wekit app
    }
  });

  grunt.registerTask('build', [
    'clean:tmp',
    'useminPrepare',
    'concat',
    'cssmin',
    'uglify',
    'copy:dist',
    'replace',
    'usemin'
  ]);

  grunt.registerTask('makeapp', ['build', 'nodewebkit', 'copy:credits']);
  grunt.registerTask('makeinst', ['makeapp', 'shell:makensis']);


};

