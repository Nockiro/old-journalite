var MEM_DEBUG = false;

var journalite = angular.module('journalite', ['ngRoute', 'crDirectives']);

// Services.

// Factory: appSettings - settings for application.
// Uses Node.js (node-webkit).
journalite.factory('appSettings', [function() {
  var gui = require('nw.gui');
  var path = require('path');
  return {
    // Path for storage.
    // On Linux: ~/.config/<AppName>/Data
    dataPath: path.join(gui.App.dataPath, 'Data'),
    
    // Node-webkit's gui object.
    gui: gui,

    // App title.
    title: gui.App.manifest.window.title,

    // Version.
    version: gui.App.manifest.version,

    // Update: { url, publicKey, defaultDownloadURL }.
    update: gui.App.manifest.update
  };
}]);


// Factory: generateUID - function that returns a random 32-character hex string.
// Uses Node.js.
journalite.factory('generateUID', function() {
  var crypto = require('crypto');
  return function() {
    return crypto.randomBytes(16).toString('hex');
  };
});

journalite.factory('verifySignature', function() {
  var crypto = require('crypto');
  return function(publicKey, data, sig) {
    sig = sig.replace('\n', '');
    return crypto.createVerify('dsaWithSHA').update(data).verify(publicKey, sig, 'base64');
  };
});

// Factory: dialog - implements alert and confirm dialog boxes.
// Wraps bootbox.
journalite.factory('dialog', ['$q', function($q) {
  return {

    alert: function(templateString, data) {
      var d = $q.defer();
      bootbox.alert(_.template(templateString)(data), function() {
        d.resolve(arguments);
      });
      return d.promise;
    },

    confirm: function(templateString, data, buttons) {
      var d = $q.defer();
      bootbox.confirm({
        closeButton: false,
        message: _.template(templateString)(data),
        buttons: buttons,
        callback: function(result) {
          if (result)
            d.resolve(result);
          else
            d.reject(result);
        }
      });
      return d.promise;
    }

  };
}]);

// Factory: fileStore - reads/writes files.
// Uses Node.js.
journalite.factory('fileStore', ['$q', 'appSettings', function($q, appSettings) {
  var fs = require('fs');
  var path = require('path');
  var mkdirp = require('mkdirp');
  var crypto = require('crypto');
  var rimraf = require('rimraf');

  var fullPath = function(filename) {
    var f = path.join.apply(this, filename.split('/'));
    return path.join(appSettings.dataPath, f);
  };

  var journalDirPath = function(journalUID) {
    return fullPath('Journals/' + journalUID);
  };

  var journalFilePath = function(journalUID) {
    return fullPath('Journals/' + journalUID + '/journal.json');
  };

  var entryFilePath = function(journalUID, entryMoment) {
    return fullPath('Journals/' + journalUID + '/' + entryMoment.format('YYYY/MM/DD') + '/entry.json');
  };

  return {
    writeFile: function(filename, data) {
      var deferred = $q.defer();
      mkdirp(path.dirname(filename), function(err) {
        if (err) return deferred.reject(err);
        fs.writeFile(filename, data, {encoding: 'utf8'}, function(err) {
          if (err) return deferred.reject(err);
          deferred.resolve();
        });
      });
      return deferred.promise;
    },

    readFile: function(filename) {
      var deferred = $q.defer();
      fs.readFile(filename, {encoding: 'utf8'}, function(err, data) {
        if (err) return deferred.reject(err);
        deferred.resolve(data);
      });
      return deferred.promise;
    },

    removeFile: function(filename) {
      var deferred = $q.defer();
      fs.unlink(filename, function(err) {
        if (err) return deferred.reject(err);
        deferred.resolve();
      });
      return deferred.promise;
    },

    getJournal: function(uid) {
      var d = $q.defer();
      fs.readFile(journalFilePath(uid), {encoding: 'utf8'}, function(err, data) {
        if (err) return d.reject(err);
        try {
          return d.resolve(angular.fromJson(data));
        } catch(e) {
          return d.reject(e);
        }
      });
      return d.promise;
    },

    getJournals: function() {
      var self = this;
      var deferred = $q.defer();
      // Read directory of journals (contains JUID subdirectories).
      fs.readdir(fullPath('Journals'), function(err, dirs) {
        if (err) {
          console.log(err);
          deferred.resolve([]);
          return;
        }
        // Read journal.json file inside each subdirectory.
        var promises = [];
        dirs.forEach(function(uid) {
          var deferredFile = $q.defer();
          fs.readFile(journalFilePath(uid), {encoding: 'utf8'}, function(err, data) {
            var journal = null;
            if (!err) {
              try {
                journal = angular.fromJson(data);
              } catch(e) {
                err = e.toString();
              }
            }
            deferredFile.resolve({error: err, journal: journal});
          });
          promises.push(deferredFile.promise);
        });
        // Parse into journals array and resolve the promise.
        $q.all(promises).then(function(results) {
          var journals = [];
          angular.forEach(results, function(result) {
            if (result.error) {
              // log error.
              //XXX show error to user?
              console.log(result.error);
            } else if (result.journal) {
              journals.push(result.journal);
            }
          });
          deferred.resolve(journals);
        });
      });
      return deferred.promise;
    },

    saveJournal: function(journal) {
      var data = angular.toJson(journal);
      return this.writeFile(journalFilePath(journal.uid), data);
    },

    removeJournal: function(journal) {
      //return this.removefile(this.journalpath(journal.uid));
      //FIXME remove only entries and journals.json, and
      // then try removing containing directory, but don't
      // remove anything extra.
      var self = this;
      var d = $q.defer();
      rimraf(journalDirPath(journal.uid), function(err) {
        if (err) {
          console.log('error removing', err);
          // We failed, but still try removing the journal file.
          self.removeFile(journalFilePath(journal.uid)).then(function() {
            // Journal removed, so the promise is resolved,
            // not rejected, but with the rimraf error assed.
            d.resolve(err);
          }, function(lastErr) {
            // Failed to remove file.
            // Report this last error and reject the promise.
            d.reject(lastErr);
          });
          return;
        }
        d.resolve();
      });
      return d.promise;
    },

    getEntryCounts: function(journalUID, yearString, monthString) {
      var self = this;
      var monthDir = path.join(journalDirPath(journalUID), yearString, monthString);
      var d = $q.defer();
      fs.readdir(monthDir, function(err, days) {
        if (err) {
          if (err.code === 'ENOENT') {
            // No directory for month, so it's a success with zero entries.
            return d.resolve({});
          }
          d.reject(err);
        }
        var promises = [];
        angular.forEach(days, function(day) {
          var deferredStat = $q.defer();
          fs.stat(path.join(monthDir, day, 'entry.json'), function(err, stats) {
            deferredStat.resolve({error: err, stats: stats, day: day});
          });
          promises.push(deferredStat.promise);
        });
        $q.all(promises).then(function(results) {
          var entryCounts = {};
          angular.forEach(results, function(r) {
            if (r.error) return; // skip errors
            if (!r.stats.isFile()) return; // skip non-files
            // This day has an entry.
            // Currently limited to 1 entry per day.
            try {
              entryCounts[parseInt(r.day, 10)] = 1;
            } catch (e) {
              // ignore parseInt error, just don't add this day.
            }
          });
          d.resolve(entryCounts);
        });
      });
      return d.promise;
    },

    // Promise; returns an entry of null if it doesn't exists.
    // Rejects promise if there's any errors.
    getEntry: function(journalUID, entryMoment) {
      return this.readFile(entryFilePath(journalUID, entryMoment)).then(
        function(data) {
          // Success; convert from JSON.
          try {
            return angular.fromJson(data);
          } catch (e) {
            console.log(e);
            return $q.reject('Loading from JSON: ' + e);
          }
        },
        function (err) {
          if (err && err.code === 'ENOENT') {
            return null;
          }
          $q.reject(err);
        }
      );
    },

    saveEntry: function(journalUID, entryMoment, entry) {
      var data = angular.toJson(entry);
      return this.writeFile(entryFilePath(journalUID, entryMoment), data);
    },

    deleteEntry: function(journalUID, entryMoment) {
      var filename = entryFilePath(journalUID, entryMoment);
      var d = $q.defer();
      fs.unlink(filename, function(err) {
        if (err) return d.reject(err);
        fs.rmdir(path.dirname(filename), function(err) {
          if (err) return d.reject(err);
          return d.resolve();
        });
      });
      return d.promise;
    }
  };

}]);


// Controllers.

journalite.controller('JournalsCtrl',
 ['$scope', '$window', '$document', 'generateUID', 'fileStore', 'dialog', 'appSettings',
  function($scope, $window, $document, generateUID, fileStore, dialog, appSettings) {
  $scope.journals = [];
  fileStore.getJournals().then(function(journals) {
    $scope.journals = journals;
  }, function(err) {
    console.log('error getting journals', err);
  });

  // Set window title to app name.
  $window.document.title = appSettings.title;

  // UIDs of journals that are currently being
  // edited (map of journal.id to 'true' or falsey).
  $scope.editingUIDs = {};

  // isEditing returns true if a journal at the given index is in editing state.
  $scope.isEditing = function(journal) {
    return $scope.editingUIDs[journal.uid];
  };

  // edit enters a journal at the given index into editing state.
  $scope.edit = function(journal) {
    $scope.editingUIDs[journal.uid] = true;
  };

  // stopEditing exists editing state of a journal at the given index.
  $scope.stopEditing = function(journal) {
    delete $scope.editingUIDs[journal.uid];
  };

  // We need to know biggest order # of journals in order to assign the next
  // order for newly created journals, so that they appear at the end.
  // TODO: when we implement manual sorting of the journals, we'd probably
  // want to just update each journal's order #.
  $scope.biggestOrder = 0;
  $scope.$watchCollection('journals', function(newValue) {
    // Find biggest order and update it.
    angular.forEach(newValue, function(journal) {
      if (journal.order > $scope.biggestOrder)
        $scope.biggestOrder = journal.order;
    });
  });
  $scope.nextOrder = function() { return ++$scope.biggestOrder; };

  // save saves a journal to disks and exists editing state.
  $scope.save = function(journal) {
    $scope.stopEditing(journal);
    fileStore.saveJournal(journal).then(
      function() {
        if (MEM_DEBUG) console.log('Journal saved', journal.uid);
      },
      function(err) {
        dialog.alert(err.toString());
      }
    );
  };

  // remove asks to confirm removal of a journal at the given index and
  // removes it if user agrees.
  $scope.remove = function(journal) {
    $scope.save(journal);
    dialog.confirm(
      'Do you really want to remove <b><%-title || "Untitled" %></b>?<br>' +
      'This action cannot be undone.',
      journal, {
        confirm: {
          label: 'Remove',
          className: 'btn-danger'
        }
      }
    ).then(function() {
      fileStore.removeJournal(journal).then(function() {
        $scope.journals.splice($scope.journals.indexOf(journal), 1);       // delete from array
      }).catch(function(err) {
        console.log(err);
        dialog.alert('Failed to remove journal.<br><%-err %>', {err: err});
      });
    });
  };

  // create creates a new journal and puts it into editing state.
  $scope.create = function() {
    var journal = {
      uid: generateUID(),
      title: '',
      coverImage: '',
      coverColor: _.sample($scope.coverColors),
      order: $scope.nextOrder()
    };
    $scope.journals.push(journal);
    $scope.edit(journal);
  };

  // Cover colors.
  $scope.coverColors = [
    'default',
    'red', 
    'blue',
    'green',
    'orange',
    'yellow',
    'teal',
    'maroon', 
    'purple',
    'fuchsia',
    'silver',
    'black'
  ];

  // Assign keyboard shortcuts.
  $document.on('keydown', function(event) {
    // Ctrl+N: create new journal.
    if (event.ctrlKey && event.keyCode === 78) {
        $scope.$apply(function() {
          $scope.create();
        });
    }
  });

  // Stop listening to keyboard shortcuts events.
  $scope.$on('$destroy', function() {
    $document.off('keydown');
  });

}]);

journalite.controller('EntriesCtrl',
  ['$scope', '$routeParams', '$q', '$window', '$document', 'appSettings', 'fileStore', 'dialog', 'journal',
    function($scope, $routeParams, $q, $window, $document, appSettings, fileStore, dialog, journal) {

  $scope.journal = journal;

  // Set window title.
  $window.document.title = ($scope.journal.title || 'Untitled') + ' - ' + appSettings.title;

  $scope.currentEntry = null;

  $scope.editorContent = {};
  $scope.editorBus = null;

  var isEmptyContent = function(content) {
    if (!content || !content.data || content.data.length === 0)
      return true;
    // One text block with empty text looks like this:
    //   {"data":[{"type":"text","data":{"text":"\n"}}]} 
    // it is also considered empty.
    if (content.data[0].type == 'text' && content.data[0].data.text === '\n')
      return true;
    return false;
  };

  // Date and its change.
  $scope.selectedMoment = moment(); // TODO: save/load last open date or always go to today?
  $scope.$watch('selectedMoment', function(newMoment, oldMoment) {
    if (angular.equals(newMoment, oldMoment)) {
      // Startup; just load entry.
      $scope.loadEntry(newMoment);
      return;
    }
    // Save old entry and then load the new one.
    $scope.saveEntry(oldMoment).then(function() {
      // Success. Load the new entry.
      $scope.loadEntry(newMoment);
    });
  });

  // Bind onClose to save journal when closing the window.
  $scope.onClose = function() {
    var sender = this;
    $scope.saveEntry($scope.selectedMoment).then(function() {
      sender.close(true);
    });
  };
  appSettings.gui.Window.get().on('close', $scope.onClose);
  
  $scope.goToJournals = function() {
    // Save current entry and then navigate away.
    $scope.saveEntry($scope.selectedMoment).then(function() {
      // Remove onClose listener.
      appSettings.gui.Window.get().removeListener('close', $scope.onClose);
      $window.location = '#/journals';
    });
  };

  // Loads entry into the editor.
  $scope.loadEntry = function(entryMoment) {
    fileStore.getEntry($scope.journal.uid, entryMoment).then(function(newEntry) {
      $scope.entry = newEntry;
      if (!$scope.entry || !$scope.entry.content) {
        // Entry didn't exist; set empty editor content.
        $scope.editorContent = {};
      } else {
        $scope.editorContent = $scope.entry.content;
      }
    }).catch(function(err) {
      console.log("getEntry: ", err);
      dialog.alert('<b>Error loading entry.</b><br><%-err %>', {err: err});
      $scope.entry = null;
      $scope.entryContent = {};
    });
  };

  // Saves current entry.
  $scope.saveEntry = function(entryMoment) {
    var entry = $scope.entry ? angular.copy($scope.entry) : null;
    var content = $scope.editorBus.readContent();
    if (!entry) {
      // Creating new entry.
      if (isEmptyContent(content)) {
        // Nothing created, don't save anything.
        return $q.when(null);
      }
      var now = moment();
      entry = {
        created: now
      };
    } else {
      if (isEmptyContent(content)) {
        // Delete entry.
        return fileStore.deleteEntry($scope.journal.uid, entryMoment).then(function() {
          if (MEM_DEBUG) console.log('Deleted', entryMoment.format());
        }).catch(function(err) {
          dialog.alert('<b>Failed to delete entry.</b><br><%-err %>', {err: err});
        });
      }
      // Updating existing entry.
      if (angular.equals(content, entry.content)) {
        // Nothing changed, don't save.
        return $q.when(null);
      }
    }
    // Update attributes.
    entry.edited = moment();
    entry.content = content;

    var save = function(journalUID, entryMoment, entry) {
      return fileStore.saveEntry(journalUID, entryMoment, entry).then(function() {
        if (MEM_DEBUG) console.log('Saved', entryMoment.format());
      }).catch(function(err) {
        dialog.confirm('<b>Error saving entry.</b><br><%-err %>', {err: err}, {
          confirm: { label: 'Retry' },
          cancel: { label: 'Forget Changes' }
        }).then(function() {
          save(journalUID, entryMoment, entry);
        });
      });
    };

    return save($scope.journal.uid, entryMoment, entry);
  };

  // Entry counts for month.
  // Responsible for providing data for highlighting days that have entries.
  $scope.monthEntryCounts = {};
  $scope.updateMonthEntryCounts = function(dateMoment) {
    fileStore.getEntryCounts(
      $scope.journal.uid,
      dateMoment.format('YYYY'),
      dateMoment.format('MM')
    ).then(function(entryCounts) {
      $scope.monthEntryCounts = entryCounts;
    }).catch(function(err) {
      console.log(err); // don't report error to user, just log it.
    });
  };
  // Update entry counts when visible month changes.
  $scope.visibleMoment = null; //XXX this is a one-way binding.
  $scope.$watch('visibleMoment', function(newValue, oldValue) {
    if (newValue) $scope.updateMonthEntryCounts(newValue);
  });

  // Assign keyboard shortcuts.
  $document.on('keydown', function(event) {
    // Ctrl+N: create new block.
    if (event.ctrlKey && event.keyCode === 78) {
        $scope.$apply(function() {
          $scope.editorBus.createBlock('text');
        });
    }
  });

  // Stop listening to keyboard shortcuts events.
  $scope.$on('$destroy', function() {
    $document.off('keydown');
  });
}]);

journalite.controller('UpdateCtrl',
  ['$scope', '$http', '$q', '$timeout', '$interval', 'appSettings', 'verifySignature',
  function($scope, $http, $q, $timeout, $interval, appSettings, verifySignature) {

  $scope.hasUpdate = false;
  $scope.downloadURL = appSettings.update.defaultDownloadURL;

  function handleUpdate(data) {
    var info = angular.fromJson(data);
    var parseIntVer = function(x) { return parseInt(x, 10); };
    var curVer = appSettings.version.split('.').map(parseIntVer);
    var newVer = (info.version || '0.0.0').split('.').map(parseIntVer);
    if (curVer.length !== 3 || newVer.length !== 3) {
      throw new Error("Failed to parse version", curVer, newVer);
    }
    if (MEM_DEBUG) console.log("Got remote version: ", newVer);
    for (var i = 0; i < curVer.length; i++) {
      if (curVer[i] < newVer[i]) {
        // Newer version available.
        $scope.hasUpdate = true;
        $scope.downloadURL = info.url || appSettings.update.defaultDownloadURL;
        // Stop update checker.
        if (updateChecker) {
          $interval.cancel(updateChecker);
          updateChecker = null;
        }
        if (MEM_DEBUG) console.log("Update available");
        //TODO whitelist download URLs.
        break;
      }
      if (curVer[i] > newVer[i]) {
        /* Updater suggested older version than we currently have. */
        break;
      }
    }
  }

  $scope.checkForUpdate = function() {
    $q.all([
      $http.get(appSettings.update.url, {transformResponse: false, cache: false}),
      $http.get(appSettings.update.signatureURL, {transformResponse: false, cache: false})
    ]).then(function(results) {
      if (results[0].status !== 200 || results[1].status !== 200) {
        console.error('Failed to update! Status: ', status);
        return $q.reject();
      }
      if (verifySignature(appSettings.update.publicKey, results[0].data, results[1].data)) {
        handleUpdate(results[0].data);
      } else {
        console.error('Failed to verify update signature');
      }
    }).catch(function(errs) {
      console.error('Error fetching update information ', errs);
    });
  };

  $scope.downloadUpdate = function() {
    appSettings.gui.Shell.openExternal($scope.downloadURL);
  };

  // Schedules check for update in a random interval from 0 to 1 minute.
  function scheduleCheckForUpdate() {
    $timeout(function() { $scope.checkForUpdate(); }, 0/*Math.random() * 60000*/);
  }

  // After launching, schedule the check for update.
  scheduleCheckForUpdate();

  // and also schedule it every 10 hours.
  var updateChecker = $interval(scheduleCheckForUpdate, 36000000);

}]);

// App
journalite.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/journals', {
      templateUrl: 'templates/journals.html',
      controller: 'JournalsCtrl'
    }).
    when('/journals/:journalUID', {
      templateUrl: 'templates/entries.html',
      controller: 'EntriesCtrl',
      resolve: {
        journal: ['$route', 'fileStore', function($route, fileStore) {
          return fileStore.getJournal($route.current.params.journalUID);
        }]
      },
    }).
    otherwise({
      redirectTo: '/journals'
    });
}]);
