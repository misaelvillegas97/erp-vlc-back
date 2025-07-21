// Test script to verify nested template creation
// This payload matches the one provided in the issue description

const testPayload = {
  "type": "inspection",
  "name": "Ejemplo",
  "description": "Ejemplo Ejemplo",
  "version": "1.0",
  "performanceThreshold": 0.75,
  "isActive": true,
  "vehicleTypes": [],
  "userRoles": [3, 4],
  "categories": [
    {
      "title": "Ejemplo",
      "description": "Ejemplo",
      "sortOrder": 0,
      "questions": [
        {
          "title": "Ejemplo",
          "description": "Ejemplo",
          "weight": 1,
          "required": true,
          "hasIntermediateApproval": false,
          "intermediateValue": 0.5,
          "extraFields": {},
          "sortOrder": 0,
          "isActive": true
        },
        {
          "title": "Ejemplo",
          "description": "Ejemplo",
          "weight": 3,
          "required": true,
          "hasIntermediateApproval": false,
          "intermediateValue": 0.5,
          "extraFields": {},
          "sortOrder": 1,
          "isActive": true
        },
        {
          "title": "Ejemplo",
          "description": "Ejemplo",
          "weight": 6,
          "required": true,
          "hasIntermediateApproval": false,
          "intermediateValue": 0.5,
          "extraFields": {},
          "sortOrder": 2,
          "isActive": true
        }
      ]
    }
  ]
};

console.log('Test Payload for Template Creation:');
console.log(JSON.stringify(testPayload, null, 2));

console.log('\nTo test this payload:');
console.log('1. Start your NestJS application');
console.log('2. Send a POST request to: /api/v1/checklists/templates');
console.log('3. Use the payload above as the request body');
console.log('4. Verify that the response includes the complete template with categories and questions');
console.log('5. Check the database to ensure all entities were created with proper relationships');

console.log('\nExpected behavior:');
console.log('- Template should be created with type="inspection", name="Ejemplo"');
console.log('- One category should be created with title="Ejemplo"');
console.log('- Three questions should be created with weights 1, 3, and 6');
console.log('- All entities should have proper foreign key relationships');
console.log('- Weight validation should pass (all questions have weight >= 0.1)');
