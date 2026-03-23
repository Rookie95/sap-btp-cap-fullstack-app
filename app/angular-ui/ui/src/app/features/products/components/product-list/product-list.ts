import { HttpClient } from '@angular/common/http';
import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, computed, ElementRef, NgZone
} from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Product } from '../../models/product.model';
import { ProductForm } from '../product-form/product-form';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; opacityDir: number;
  hue: number; type: number; rotation: number; rotSpeed: number;
}

@Component({
  selector: 'app-product-list',
  imports: [ProductForm, CommonModule, FormsModule, DecimalPipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit, AfterViewInit, OnDestroy {
  protected readonly title = signal('ui');
  products = signal<Product[]>([]);

  showForm = false;
  showDeleteConfirm = false;
  selectedProduct: any = null;
  productToDelete: any = null;
  isLoading = false;
  isSaving = false;
  searchQuery = '';

  filteredProducts = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.products();
    return this.products().filter(p => p.name?.toLowerCase().includes(q));
  });

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animFrameId = 0;
  private resizeObserver!: ResizeObserver;

  private readonly avatarHues = [260, 320, 170, 45, 200, 15, 280];

  constructor(private http: HttpClient, private zone: NgZone, private elRef: ElementRef) { }

  ngOnInit() { this.getProducts(); }

  ngAfterViewInit() {
    this.initCanvas();
    this.drawSparklines();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
  }

  /* ══════════════════════════════════════
     CANVAS PARTICLE BACKGROUND
  ══════════════════════════════════════ */
  private initCanvas() {
    this.canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.spawnParticles();
    });
    this.resizeObserver.observe(document.body);

    this.spawnParticles();
    this.zone.runOutsideAngular(() => this.animate());
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private spawnParticles() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.particles = [];
    const count = Math.floor((W * H) / 14000);

    for (let i = 0; i < count; i++) {
      this.particles.push(this.makeParticle(W, H));
    }
  }

  private makeParticle(W: number, H: number, x?: number, y?: number): Particle {
    const types = [0, 1, 2, 3];  // 0=box, 1=circle, 2=diamond, 3=tag
    const hues = [260, 170, 320, 45];
    const t = types[Math.floor(Math.random() * types.length)];
    return {
      x: x ?? Math.random() * W,
      y: y ?? Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 14 + 6,
      opacity: Math.random() * 0.25 + 0.05,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      hue: hues[Math.floor(Math.random() * hues.length)],
      type: t,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.008,
    };
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.strokeStyle = `hsl(${p.hue}, 80%, 70%)`;
    ctx.lineWidth = 1;
    ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, 0.08)`;

    const s = p.size;
    switch (p.type) {
      case 0: // product box
        ctx.beginPath();
        ctx.roundRect(-s / 2, -s / 2, s, s, 3);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s / 2, -s / 2 + s * 0.35);
        ctx.lineTo(s / 2, -s / 2 + s * 0.35);
        ctx.stroke();
        break;
      case 1: // price tag
        ctx.beginPath();
        ctx.roundRect(-s / 2, -s / 4, s, s / 2, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s / 3, 0, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 2: // diamond
        ctx.beginPath();
        ctx.moveTo(0, -s / 2);
        ctx.lineTo(s / 2, 0);
        ctx.lineTo(0, s / 2);
        ctx.lineTo(-s / 2, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      case 3: // package
        ctx.beginPath();
        ctx.moveTo(0, -s / 2);
        ctx.lineTo(s / 2, -s / 4);
        ctx.lineTo(s / 2, s / 4);
        ctx.lineTo(0, s / 2);
        ctx.lineTo(-s / 2, s / 4);
        ctx.lineTo(-s / 2, -s / 4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -s / 2); ctx.lineTo(0, s / 2);
        ctx.moveTo(-s / 2, -s / 4); ctx.lineTo(s / 2, -s / 4);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  private animate() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, W, H);

    // Ambient orbs
    const addOrb = (x: number, y: number, r: number, h: number, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${h}, 70%, 50%, ${alpha})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const t = Date.now() / 5000;
    addOrb(W * 0.15 + Math.sin(t) * 60, H * 0.2 + Math.cos(t * 0.7) * 40, 380, 260, 0.08);
    addOrb(W * 0.85 + Math.cos(t * 0.8) * 50, H * 0.75 + Math.sin(t) * 30, 300, 320, 0.06);
    addOrb(W * 0.5 + Math.sin(t * 1.2) * 40, H * 0.5 + Math.cos(t * 0.9) * 30, 200, 170, 0.04);

    // Draw & update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      this.drawParticle(p);

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.opacity += p.opacityDir * 0.0015;

      if (p.opacity > 0.3) { p.opacityDir = -1; }
      if (p.opacity < 0.03) { p.opacityDir = 1; }

      if (p.y < -40 || p.x < -40 || p.x > W + 40) {
        this.particles[i] = this.makeParticle(W, H, Math.random() * W, H + 20);
      }
    }

    // Subtle connection lines between close particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i], p2 = this.particles[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.save();
          ctx.globalAlpha = (1 - dist / 120) * 0.06;
          ctx.strokeStyle = `hsl(${(p1.hue + p2.hue) / 2}, 70%, 70%)`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }

  /* ══════════════════════════════════════
     SPARK LINES (stat cards)
  ══════════════════════════════════════ */
  private drawSparklines() {
    const colors = ['#7c6cf8', '#f86ca0', '#fbbf24', '#6cf8c8'];
    for (let i = 0; i < 4; i++) {
      const c = document.getElementById(`spark-${i}`) as HTMLCanvasElement;
      if (!c) continue;
      const cx = c.getContext('2d')!;
      const W = c.width, H = c.height;
      const pts = Array.from({ length: 10 }, () => Math.random() * 0.6 + 0.2);
      pts[pts.length - 1] = 0.85;

      cx.clearRect(0, 0, W, H);
      cx.beginPath();
      pts.forEach((v, idx) => {
        const x = (idx / (pts.length - 1)) * W;
        const y = H - v * H;
        idx === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
      });
      cx.strokeStyle = colors[i];
      cx.lineWidth = 1.5;
      cx.stroke();

      // Fill area
      cx.lineTo(W, H); cx.lineTo(0, H); cx.closePath();
      cx.fillStyle = colors[i] + '18';
      cx.fill();
    }
  }

  /* ══════════════════════════════════════
     OData API — UNCHANGED
  ══════════════════════════════════════ */
  getProducts() {
    this.isLoading = true;
    this.http.get<any>(`${environment.api}/v4/catalog/Products`)
      .subscribe({
        next: (res) => {
          this.products.set(res.value);
          this.isLoading = false;
          this.drawSparklines();
          this.updateLiveCount();
        },
        error: () => {
          this.isLoading = false;
          this.showToast('Failed to load products', 'error');
        }
      });
  }

  saveProduct(productData: any) {
    this.isSaving = true;

    const payload = {
      name: productData.name,
      price: Number(productData.price).toFixed(2),
      stock: Number(productData.stock)
    };

    if (productData.ID) {
      this.http.patch(`/odata/v4/catalog/Products(${productData.ID})`, payload)
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.showToast('Product updated ✓', 'success');
            this.afterSave();
          },
          error: () => {
            this.isSaving = false;
            this.showToast('Update failed', 'error');
          }
        });
    } else {
      this.http.post('/odata/v4/catalog/Products', payload)
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.showToast('Product created ✓', 'success');
            this.afterSave();
          },
          error: () => {
            this.isSaving = false;
            this.showToast('Create failed', 'error');
          }
        });
    }
  }

  afterSave() {
    this.showForm = false;
    this.selectedProduct = null;
    this.getProducts();
  }

  confirmDelete(product: any) {
    this.productToDelete = product;
    this.showDeleteConfirm = true;
  }

  executeDelete() {
    if (!this.productToDelete) return;
    this.isSaving = true;
    this.http.delete(`/odata/v4/catalog/Products(${this.productToDelete.ID})`).subscribe({
      next: () => {
        this.isSaving = false;
        this.showToast(`"${this.productToDelete.name}" deleted`, 'error');
        this.showDeleteConfirm = false;
        this.productToDelete = null;
        this.getProducts();
      },
      error: () => { this.isSaving = false; this.showToast('Delete failed', 'error'); }
    });
  }

  deleteProduct(product: any) { this.confirmDelete(product); }

  openAddForm() {
    this.selectedProduct = { name: '', price: 0, stock: 0 };
    this.showForm = true;
  }

  editProduct(product: any) {
    this.selectedProduct = { ...product };
    this.showForm = true;
  }

  closeModal(event: MouseEvent) {
    if ((event.target as Element).classList.contains('modal-backdrop')) this.showForm = false;
  }

  closeDeleteModal(event: MouseEvent) {
    if ((event.target as Element).classList.contains('modal-backdrop')) this.showDeleteConfirm = false;
  }

  onSearch() { }

  /* ══════════════════════════════════════
     HELPERS
  ══════════════════════════════════════ */
  getTotalStock() { return this.products().reduce((a, p) => a + (p.stock || 0), 0); }
  getAvgPrice() { const ps = this.products(); return ps.length ? (ps.reduce((a, p) => a + (p.price || 0), 0) / ps.length).toFixed(0) : '0'; }
  getInventoryValue() {
    const v = this.products().reduce((a, p) => a + (p.price || 0) * (p.stock || 0), 0);
    return v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0);
  }

  getAvatarHue(name: string): number {
    return this.avatarHues[(name?.charCodeAt(0) || 0) % this.avatarHues.length];
  }

  getStockWidth(stock: number): number { return Math.min((stock / 200) * 100, 100); }

  private updateLiveCount() {
    const el = document.getElementById('live-count');
    if (el) el.textContent = this.products().length.toString();
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3000);
  }
}