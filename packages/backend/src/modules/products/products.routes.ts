import { Router } from 'express';
import { ProductsController } from './products.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new ProductsController();
export const productsRouter = Router();

productsRouter.use(authenticate);
productsRouter.use(requireTenant);

productsRouter.get('/', controller.list);
productsRouter.get('/:id', controller.getById);
productsRouter.post('/', authorize('products:create'), controller.create);
productsRouter.put('/:id', authorize('products:edit'), controller.update);
productsRouter.delete('/:id', authorize('products:delete'), controller.delete);
productsRouter.post('/import', authorize('products:create'), controller.importProducts);
productsRouter.get('/export/csv', authorize('products:export'), controller.exportProducts);
