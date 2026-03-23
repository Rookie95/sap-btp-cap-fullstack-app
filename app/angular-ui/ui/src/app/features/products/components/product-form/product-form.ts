import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-product-form',
  imports: [FormsModule, CommonModule, DecimalPipe],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  @Input() product: any = { name: '', price: 0, stock: 0 };
  @Input() isSaving = false;
  @Output() save  = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  submit() {
    if (!this.product.name || this.product.price <= 0) return;
    this.save.emit(this.product);
  }

  cancel() { this.close.emit(); }

  getStockPct(): number {
    return Math.min(((this.product.stock || 0) / 200) * 100, 100);
  }
}