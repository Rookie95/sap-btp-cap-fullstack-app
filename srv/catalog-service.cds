using { my.poc as db } from '../db/schema'; 
service CatalogService {
    entity Products as Projection on db.Products;
}