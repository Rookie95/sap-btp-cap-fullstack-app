import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-form',
  imports: [FormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  @Input() product: any = { name: '', price: 0, stock: 0 };
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  //   product = {
  //   name: '',
  //   price: 0,
  //   stock: 0
  // };

  submit() {
    console.log('Form Data:', this.product);
    this.save.emit(this.product);
  }
  cancel() {
    this.close.emit();
  }
}
