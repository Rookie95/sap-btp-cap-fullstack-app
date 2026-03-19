using { my.poc as db } from '../db/schema';

@requires: 'User'
service CatalogService {
    entity Products as Projection on db.Products;
}