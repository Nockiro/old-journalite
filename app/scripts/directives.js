angular.module('crDirectives', []).

// <cr-calendar selected-date="model" entry-counts="model" />
// Requires pikaday.js (and moment.js before it).
directive('crCalendar', ['$parse', function($parse) {
  return {
    restrict: 'E',
    link: function(scope, element, attrs) {
      var selectedMoment = scope[attrs.selectedMoment] || moment();
      var setSilently = false;
      var calendar = new Pikaday({
        defaultDate: selectedMoment.toDate(),
        setDefaultDate: true,
        firstDay: moment().weekday(0).isoWeekday() === 1 ? 1 : 0,
        onSelect: function() {
          if (setSilently) return;
          if (!attrs.selectedMoment) return;
          scope.$apply(function() {
            $parse(attrs.selectedMoment).assign(scope, calendar.getMoment());
          });
        },
        onDraw: function() {
          if (!attrs.visibleMoment) return;
          var year = calendar.getVisibleYear();
          var month = calendar.getVisibleMonth();
          var current = scope[attrs.visibleMoment];
          if (!current || current.year !== year || current.month !== month) {
            scope.$apply(function() {
              $parse(attrs.visibleMoment).assign(scope, moment([year, month]));
            });
          }
        },
      });
      if (attrs.selectedMoment) {
        scope.$watch(attrs.selectedMoment, function(newDate, oldDate) {
          if (calendar.getDate() != newDate) {
            setSilently = true;
            calendar.setDate(newDate);
            setSilently = false;
          }
        });
      }
      if (attrs.entryCounts) {
        scope.$watchCollection(attrs.entryCounts, function(newValue) {
          calendar.setEntries(newValue);
        });
      }
      element.append(calendar.el);
    }
  };
}]).

// <cr-sir-trevor content="model" bus="model" />
// Requires sir-trevor.js.
directive('crSirTrevor', ['$compile', '$timeout', function($compile, $timeout) {
  var EMPTY_CONTENT = {"data":[]};
  return {
    restrict: 'E',
    link: function(scope, element, attrs) {
      /* Configure Sir Trevor to skip validations. */
      SirTrevor.SKIP_VALIDATION = true;

      var editor = null;

      var renderEditor = function (content) {
        if (editor) editor.destroy();
        element.html('<form><div class="errors"></div><textarea></textarea></form>');
        var textarea = element.find('textarea');
        textarea.text(JSON.stringify(content || EMPTY_CONTENT));
        editor = new SirTrevor.Editor({
          el: textarea,
          blockTypes: ["Heading", "Text", "List", "Image"]
        });
      };

      scope.$watch(attrs.content, function(newContent) {
        renderEditor(newContent);
      });

      scope[attrs.bus] = {
        readContent: function() {
          if (editor.onFormSubmit() === 0 /* success */) {
            return angular.copy(editor.dataStore);
          } else {
            /* failure */
            return null;
          }
        },
        createBlock: function(type) {
          editor.createBlock(type);
        }
      };

      element.on('$destroy', function() {
        editor.destroy();
      });
    }
  };
}]);
