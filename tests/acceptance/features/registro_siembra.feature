Feature: Registro de Siembra
  Como un Sembrador voluntario
  Quiero registrar la cantidad de semillas que planto
  Para que la coordinación pueda llevar un control del inventario y progreso

  Scenario: Sembrador registra una nueva plantación exitosamente
    Given que estoy en la página principal de la aplicación
    And selecciono la primera campaña disponible
    And me identifico como "Sembrador"
    And selecciono mi equipo de trabajo
    When selecciono que estoy sembrando una especie disponible
    And incremento la cantidad de golpes a 2
    Then compruebo que el botón "Registrar Siembra" está habilitado
