import React, { useState, useRef } from 'react';
import { X, Plus, Loader2, Camera, UploadCloud } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProductModal({ onClose, onSuccess }: ProductModalProps) {
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    category: ''
  });

  // Predefined seasonal categories
  const suggestedCategories = [
    "Pijamas", 
    "Pantuflas", 
    "Sombreros", 
    "Sombrillas", 
    "Botas para lluvia", 
    "Impermeables"
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Convert to webp to save space
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if too large
        const MAX_SIZE = 800;
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            setImageFile(blob);
            setPreview(URL.createObjectURL(blob));
          }
        }, 'image/webp', 0.8); // 80% quality webp
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      let imageUrl = '';
      
      // Upload image if exists
      if (imageFile) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile, { contentType: 'image/webp' });
          
        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          // Non-blocking, will continue saving the product without image or handle it? 
          // Better to throw if it's strictly required, but let's just log and continue for now.
        } else if (uploadData) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      const { error } = await supabase.from('products').insert([
        { 
          name: formData.name, 
          sku: formData.sku, 
          price: parseFloat(formData.price), 
          cost: parseFloat(formData.cost || '0'),
          stock: parseInt(formData.stock), 
          category: formData.category || 'General',
          image: imageUrl,
          active: true 
        }
      ]);
      if (error) throw error;
      alert('Producto agregado con éxito');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error agregando el producto');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-outline-variant bg-surface-container-low shrink-0">
          <h3 className="text-title-md text-on-surface font-bold">Agregar Producto Nuevo</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleAddProduct} className="p-6 flex flex-col gap-4 overflow-y-auto">
          
          {/* Image Upload Area */}
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant block">Fotografía del Producto</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center bg-surface hover:bg-surface-variant transition-colors cursor-pointer relative overflow-hidden"
            >
              {preview ? (
                <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera size={24} className="text-on-surface-variant mb-2" />
                  <span className="text-body-sm text-on-surface-variant text-center px-4">Toca para tomar foto o selecciona un archivo</span>
                </>
              )}
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="environment" // Hint for mobile devices to open the back camera
              className="hidden" 
              onChange={handleImageChange}
            />
          </div>

          <div>
            <label className="text-label-caps text-on-surface-variant mb-1 block">Categoría</label>
            <input 
              required 
              list="categories-list"
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              type="text" 
              className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none" 
              placeholder="Ej. Botas para lluvia" 
            />
            <datalist id="categories-list">
              {suggestedCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-label-caps text-on-surface-variant mb-1 block">Nombre</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ej. Zapatos Casuales" />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant mb-1 block">SKU</label>
            <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono uppercase" placeholder="ZAP-CAS-001" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label-caps text-on-surface-variant mb-1 block">Costo ($)</label>
              <input required value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono" placeholder="0.00" />
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant mb-1 block">Precio de Venta ($)</label>
              <input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono" placeholder="0.00" />
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant mb-1 block">Stock Inicial</label>
              <input required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} type="number" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono" placeholder="0" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-on-surface-variant font-bold hover:bg-surface-variant rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={adding} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
