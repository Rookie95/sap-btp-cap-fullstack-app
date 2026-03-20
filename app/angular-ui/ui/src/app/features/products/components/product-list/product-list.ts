import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Product } from '../../models/product.model';
import { ProductForm } from '../product-form/product-form';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-list',
  imports: [ProductForm, CommonModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit{
  protected readonly title = signal('ui');
  products = signal<Product[]>([]);
  showForm = false;
  selectedProduct: any = null;
  constructor(private http: HttpClient){}
    ngOnInit() {
 this.getProducts();
  
  }

  getProducts(){
     this.http.get<any>(`${environment.api}/v4/catalog/Products`)
      .subscribe(res => {
        this.products.set(res.value);
      });
  }

  saveProduct(productData: any) {

  // EDIT case
  if (productData.ID) {

    this.http.patch(
      `/odata/v4/catalog/Products(${productData.ID})`,
      {
        name: productData.name,
        price: productData.price.toFixed(2),
        stock: productData.stock
      }
    ).subscribe(() => {
      alert('Product Updated ✅');
      this.afterSave();
    });

  } else {

    // CREATE case
    const payload = {
      // ID: crypto.randomUUID(),
      name: productData.name,
      price: productData.price.toFixed(2),
      stock: productData.stock
    };

    this.http.post('/odata/v4/catalog/Products', payload)
      .subscribe(() => {
        alert('Product Created ✅');
        this.afterSave();
      });
  }
}

afterSave() {
  this.showForm = false;
  this.selectedProduct = null;
  this.getProducts();
}

//   addProduct(productData: any) {
//   console.log('Add clicked');
//   const payload ={
//      ID: crypto.randomUUID(),       // 👈 important for HANA
//     name: productData.name,
//     price: productData.price.toFixed(2), // 👈 decimal fix
//     stock: productData.stock
//   }

//   this.http.post('/odata/v4/catalog/Products', payload)
//     .subscribe({
//       next: () => {
//         alert('Product Created ✅');
//         this.showForm = false;     // 👈 close form
//         this.getProducts();       // 👈 refresh list
//       },
//       error: (err) => {
//         console.error(err);
//         alert('Error creating product ❌');
//       }
//     });
// }
  openAddForm() {
  this.selectedProduct = { name: '', price: 0, stock: 0 };
  this.showForm = true;
}
editProduct(product: any) {
  this.selectedProduct = { ...product }; // clone
  this.showForm = true;
}

deleteProduct(product: any) {
 if (!confirm('Delete this product?')) return;

  this.http.delete(`/odata/v4/catalog/Products(${product.ID})`)
    .subscribe(() => {
      alert('Product Deleted 🗑️');
      this.getProducts();
    });
}
}
