// wrap in Immediately Invoked Function Expression to avoid global scope 
(function() {
    'use strict';

    // set authentication-factory application and register its factory
    angular
        .module("authentication-factory", [])
        .factory("authenticationFactory", authenticationFactory);

    // add additional services to be used within the factory
    authenticationFactory.$inject = ["$http", "$log", "$rootScope", "$window"];

    // define the factory
    function authenticationFactory($http, $log, $rootScope, $window) {
        // --------------------------------------------------------------------
        // for backend 
        var backendBaseUrl = api_config.authentication_uri;
        var getAllPersonasUrl = backendBaseUrl + "getAllPersonas";
        var getSinglePersonaUrl = backendBaseUrl + "getSinglePersona";

        // --------------------------------------------------------------------
        // for local storage 
        var currentPersonaInLocalStorage = "currentGestaltPersona";
        // ensure that view is the same when application is opened in multiple tabs
        angular.element($window).on("storage", function(event) {
            if(event.key === currentPersonaInLocalStorage) {
                $rootScope.$apply();
            }
        });                            

        // --------------------------------------------------------------------
        // return an authenticationFactory instance
        var authenticationFactory = {
            getAllPersonas: getAllPersonas,
            setCurrentPersona: setCurrentPersona,
            getCurrentPersona: getCurrentPersona,
            unsetCurrentPersona: unsetCurrentPersona,
            cleanup: cleanup
        }
        return authenticationFactory;

        // --------------------------------------------------------------------
        // function definition used in factory instance
        function callBackend(backendUrl) {
            $log.log("****** GET " + backendUrl + " ******");
            return $http.get(backendUrl)
                        .then(function(backendResponse) { return backendResponse.data; });
        }

        function getAllPersonas() {
            return callBackend(getAllPersonasUrl);
        }

        function getPersona(personaId) {
            // available but NOT USED 
            return callBackend(getSinglePersonaUrl + "/" + personaId);
        }

        function setCurrentPersona(personaId, personaName) {
            var currentPersona = {
                id: personaId,
                name: personaName
            };
            $window.localStorage && $window.localStorage.setItem(currentPersonaInLocalStorage, JSON.stringify(currentPersona));
        }

        function getCurrentPersona() {
            return JSON.parse($window.localStorage && $window.localStorage.getItem(currentPersonaInLocalStorage));
        }

        function unsetCurrentPersona() {
            $window.localStorage && $window.localStorage.removeItem(currentPersonaInLocalStorage);
        }

        function cleanup() {
            unsetCurrentPersona();
        }

    }

})();
