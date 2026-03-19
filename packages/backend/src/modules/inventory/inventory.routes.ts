import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new InventoryController();
export const inventoryRouter = Router();
inventoryRouter.use(authenticate);
inventoryRouter.use(requireTenant);

// Products/Items
inventoryRouter.get('/items', controller.listItems);
inventoryRouter.get('/items/:id', controller.getItem);
inventoryRouter.post('/items', authorize('inventory:create'), controller.createItem);
inventoryRouter.put('/items/:id', authorize('inventory:edit'), controller.updateItem);
inventoryRouter.delete('/items/:id', authorize('inventory:delete'), controller.deleteItem);

// Stock levels
inventoryRouter.get('/stock', controller.getStockLevels);
inventoryRouter.get('/stock/:itemId', controller.getItemStock);
inventoryRouter.get('/stock/low-stock', controller.getLowStockAlerts);

// Adjustments
inventoryRouter.get('/adjustments', controller.listAdjustments);
inventoryRouter.post('/adjustments', authorize('inventory:edit'), controller.createAdjustment);
inventoryRouter.get('/adjustments/:id', controller.getAdjustment);

// Transfers between locations
inventoryRouter.get('/transfers', controller.listTransfers);
inventoryRouter.post('/transfers', authorize('inventory:edit'), controller.createTransfer);
inventoryRouter.post('/transfers/:id/receive', authorize('inventory:edit'), controller.receiveTransfer);

// Locations/Warehouses
inventoryRouter.get('/locations', controller.listLocations);
inventoryRouter.post('/locations', authorize('inventory:create'), controller.createLocation);
inventoryRouter.put('/locations/:id', authorize('inventory:edit'), controller.updateLocation);

// Assemblies / Bill of Materials
inventoryRouter.get('/assemblies', controller.listAssemblies);
inventoryRouter.post('/assemblies', authorize('inventory:create'), controller.createAssembly);
inventoryRouter.post('/assemblies/:id/build', authorize('inventory:edit'), controller.buildAssembly);

// Reports
inventoryRouter.get('/reports/valuation', controller.valuationReport);
inventoryRouter.get('/reports/movement', controller.movementReport);
