// Generated from: tests/acceptance/features/registro_siembra.feature
import { test } from "playwright-bdd";

test.describe('Registro de Siembra', () => {

  test('Sembrador registra una nueva plantación exitosamente', async ({ Given, When, Then, And, page }) => { 
    await Given('que estoy en la página principal de la aplicación', null, { page }); 
    await And('selecciono la primera campaña disponible', null, { page }); 
    await And('me identifico como "Sembrador"', null, { page }); 
    await And('selecciono mi equipo de trabajo', null, { page }); 
    await When('selecciono que estoy sembrando una especie disponible', null, { page }); 
    await And('incremento la cantidad de golpes a 2', null, { page }); 
    await Then('compruebo que el botón "Registrar Siembra" está habilitado', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/acceptance/features/registro_siembra.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":6,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given que estoy en la página principal de la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And selecciono la primera campaña disponible","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And me identifico como \"Sembrador\"","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And selecciono mi equipo de trabajo","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"When selecciono que estoy sembrando una especie disponible","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And incremento la cantidad de golpes a 2","stepMatchArguments":[{"group":{"start":35,"value":"2","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":13,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then compruebo que el botón \"Registrar Siembra\" está habilitado","stepMatchArguments":[]}]},
]; // bdd-data-end