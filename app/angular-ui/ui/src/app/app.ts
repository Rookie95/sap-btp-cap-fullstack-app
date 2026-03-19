import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit{
  protected readonly title = signal('ui');
  // products:any[] = [];
  products = signal<any[]>([]);
  constructor(private http: HttpClient){}
    ngOnInit() {
      this.http.get<any>(`${environment.api}/v4/catalog/Products`)
      .subscribe(res => {
        this.products.set(res.value);
      });
  
  }
  addProduct() {
  alert('Add Product Clicked');
}

editProduct(product: any) {
  alert('Edit: ' + product.name);
}

deleteProduct(product: any) {
  alert('Delete: ' + product.name);
}
}
