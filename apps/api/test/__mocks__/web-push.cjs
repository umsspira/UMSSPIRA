// Doble de `web-push` para Jest (CommonJS).
// El paquete real es ESM ("type": "module") y ts-jest no lo transpila en
// el entorno CJS de las pruebas e2e. Aquí se expone la misma API con dobles.
const webpush = {
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
  generateVAPIDKeys: jest.fn(() => ({
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
  })),
};

module.exports = webpush;
module.exports.default = webpush;
module.exports.__esModule = true;
