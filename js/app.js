// Define our application with name and dependencies
const app = angular.module('taskHelper', ['ngRoute', 'ngCookies']); // Empty array for no dependencies

// Helpers functions for converting time to date object.
const myHelpers = {
    prefixZero: function (string) {
        return string.length == 1 ? '0' + string : string;
    },

    timeObjToString: function (dateObj) {
        const hour = myHelpers.prefixZero(String(dateObj.getHours()));
        const minute = myHelpers.prefixZero(String(dateObj.getMinutes()));
        const second = myHelpers.prefixZero(String(dateObj.getSeconds()));
        return hour + ":" + minute + ":" + second;
    },

    stringToObjTime: function (string) {
        return new Date(0, 0, 0, string.substring(0, 2), string.substring(3, 5), string.substring(6, 8))
    }
};

// Defining routing with ng-route
app.config(function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/steps.html',
            controller: 'StepsViewController'
        })
        .when('/steps', {
            templateUrl: 'views/steps.html',
            controller: 'StepsViewController'
        })
        .when('/steps/new', {
            templateUrl: 'views/stepForm.html',
            controller: 'StepViewController'
        })
        // Route with parameters
        .when('/steps/edit/:id', {
            templateUrl: 'views/stepForm.html',
            controller: 'StepViewController'
        })
        // If not existing route, redirect to main page.
        .otherwise({
            redirectTo: '/'
        })
});

// Defining our service for tasks
app.factory('TaskService', function () {
    const service = {};

    service.entries = [];

    service.getNewId = function () {
        if (service.entries.length == 0) {
            service.newId = 0;
        } else {
            if (!service.newId) {
                service.newId = _.max(service.entries, function (entry) {
                    return entry.id;
                }).id;
            }
        }

        return ++service.newId;
    };

    service.findById = function (id) {
        return _.find(service.entries, function (entry) {
            return entry.id == id;
        })
    };

    service.save = function (entry) {
        const toUpdate = service.findById(entry.id);
        if (toUpdate) {
            // Copy data from one object to another object
            _.extend(toUpdate, entry);
        } else {
            entry.id = service.getNewId();
            service.entries.push(entry);
        }
    };

    service.remove = function (entry) {
        // return collection without element which satisfy function
        service.entries = _.reject(service.entries, function (element) {
            return element.id == entry.id;
        })
    };

    return service;
});

// Creating our controller for view, second argument is constructor
// Controller for main page
app.controller('HomeViewController', ['$scope', '$interval', '$cookies', 'TaskService', function ($scope, $interval, $cookies, TaskService) {
    $scope.appTitle = "Task Helper";

    showNotification = function (text) {
        $scope.notification = text;
        $scope.showNotification = true;
        $interval(function () {
            $scope.showNotification = false;
        }, 2000, 1);
    };

    $scope.startTimer = function () {
        if (!$scope.timeInterval) {
            $scope.timeInterval = $interval(function () {
                $scope.task.time.setSeconds($scope.task.time.getSeconds() + 1);
                $scope.timeString = myHelpers.timeObjToString($scope.task.time);
            }, 1000);
        }
    };
    $scope.pauseTimer = function () {
        if ($scope.timeInterval) {
            $interval.cancel($scope.timeInterval);
            $scope.timeInterval = undefined;
        }
    };
    $scope.resetTimer = function () {
        $scope.pauseTimer();
        $scope.task.time = new Date(0, 0, 0, 0, 0, 0);
        $scope.timeString = myHelpers.timeObjToString($scope.task.time);
    };

    const stepsStoreName = 'task-helper-steps';
    const taskStoreName = 'task-helper-task';
    $scope.saveData = function () {
        const task = _.clone($scope.task);
        task.time = myHelpers.timeObjToString($scope.task.time);

        $cookies.putObject(stepsStoreName, TaskService.entries);
        $cookies.putObject(taskStoreName, task);

        showNotification("All data saved.");
    };

    $scope.loadData = function () {
        TaskService.entries = $cookies.getObject(stepsStoreName);
        if (!TaskService.entries) {
            TaskService.entries = [];
        }

        let task = $cookies.getObject(taskStoreName);
        if (!task) {
            task = {
                description: "",
                time: new Date(0, 0, 0, 0, 0, 0, 0)
            };
        } else {
            task.time = myHelpers.stringToObjTime(task.time);
        }

        if (!$scope.task) {
            $scope.task = {};
        }
        _.extend($scope.task, task);
        $scope.timeString = myHelpers.timeObjToString($scope.task.time);

        showNotification("All data loaded.");
    };

    $scope.loadData();

    // Automatic save after minute.
    $interval(function () {
        $scope.saveData();
    }, 60000);
}]);

// Controller for listing all steps
app.controller('StepsViewController', ['$scope', 'TaskService', function ($scope, TaskService) {
    $scope.steps = TaskService.entries;

    $scope.remove = function (step) {
        TaskService.remove(step);
    };

    $scope.$watch(function () {
        return TaskService.entries;
    }, function (entries) {
        $scope.steps = entries;
    });
}]);

// Controller with route parameters and location parameter
// Controller for editing a creating new steps
app.controller('StepViewController', ['$scope', '$routeParams', '$location', 'TaskService', function ($scope, $routeParams, $location, TaskService) {
    if (!$routeParams.id) {
        $scope.step = {};
    } else {
        // Beware of two way data binding! -> clone it
        $scope.step = _.clone(TaskService.findById($routeParams.id));
    }

    $scope.save = function () {
        TaskService.save($scope.step);
        $location.path('/');
    }
}]);

// Defining custom element
app.directive('taskStep', function () {
    return {
        restrict: 'E', // Element type of directive
        templateUrl: 'views/step.html' // For html use template
    }
});
