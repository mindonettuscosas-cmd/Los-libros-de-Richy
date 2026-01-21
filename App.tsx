
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Lock,
  Unlock,
  X, 
  Sparkles,
  Save,
  Edit3,
  Check,
  Download,
  Upload,
  Image as ImageIcon,
  Eye,
  Tag as TagIcon
} from 'lucide-react';
import { Book, BookStatus } from './types';
import { getBookDetails, generateBookCover } from './geminiService';
import { StarRating } from './components/StarRating';

const ADMIN_PASSWORD = 'aticus72';
const STORAGE_KEY = 'libros_richy_v5_final';

const getStatusColor = (status: BookStatus) => {
  switch (status) {
    case BookStatus.READ: return 'bg-emerald-500 border-emerald-400/50';
    case BookStatus.REREAD: return 'bg-blue-500 border-blue-400/50';
    case BookStatus.PENDING: return 'bg-amber-500 border-amber-400/50';
    case BookStatus.ABANDONED: return 'bg-rose-600 border-rose-400/50';
    case BookStatus.READING: return 'bg-sky-500 border-sky-400/50';
    default: return 'bg-slate-700 border-slate-600';
  }
};

const formatDriveUrl = (url: string) => {
  if (!url) return '';
  const driveRegex = /(?:https?:\/\/)?(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
  }
  return url;
};

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState<Partial<Book>>({
    title: '', author: '', year: new Date().getFullYear(), description: '',
    rating: 0, status: BookStatus.PENDING, coverUrl: '', genres: []
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  const handleExport = useCallback(() => {
    if (!isAdmin) return;
    if (books.length === 0) return alert("No hay registros para guardar.");
    try {
      const dataStr = JSON.stringify(books, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = `biblioteca_richy_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error al generar el archivo.");
    }
  }, [books, isAdmin]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setBooks(data);
          alert(`¡Éxito! Se han cargado ${data.length} libros.`);
        }
      } catch (err) {
        alert("Archivo JSON no válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadAIImage = () => {
    if (!aiGeneratedImage) return;
    const link = document.createElement('a');
    link.href = aiGeneratedImage;
    link.download = `${formData.title || 'portada'}_IA.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.genres?.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          genres: [...(prev.genres || []), tagInput.trim()]
        }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres?.filter(t => t !== tagToRemove)
    }));
  };

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPasswordInput('');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchText = (b.title + b.author + (b.genres?.join(' ') || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || b.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [books, searchTerm, statusFilter]);

  const handleSaveEntry = () => {
    if (!formData.title || !formData.author) return alert('Título y Autor requeridos');
    const finalUrl = formatDriveUrl(formData.coverUrl || '');
    
    if (isEditing && formData.id) {
      setBooks(prev => prev.map(b => b.id === formData.id ? { ...b, ...formData, coverUrl: finalUrl } as Book : b));
    } else {
      const newBook: Book = {
        id: Date.now().toString(),
        title: formData.title || '',
        author: formData.author || '',
        year: formData.year || new Date().getFullYear(),
        description: formData.description || '',
        rating: formData.rating || 0,
        status: formData.status || BookStatus.PENDING,
        coverUrl: finalUrl || 'https://images.unsplash.com/photo-1543004471-2401c3eaa991?q=80&w=1000&auto=format&fit=crop',
        genres: formData.genres || []
      };
      setBooks(prev => [newBook, ...prev]);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', author: '', year: new Date().getFullYear(), description: '', rating: 0, status: BookStatus.PENDING, coverUrl: '', genres: [] });
    setIsEditing(false);
    setAiGeneratedImage(null);
    setTagInput('');
  };

  const handleAISuggest = async () => {
    if (!formData.title) return alert('Escribe el título');
    setLoadingAI(true);
    try {
      const d = await getBookDetails(formData.title);
      setFormData(prev => ({ ...prev, ...d }));
    } catch (e) { alert('Error con la IA'); }
    finally { setLoadingAI(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 selection:bg-rose-500/30">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500 bg-clip-text text-transparent uppercase tracking-tighter italic leading-none">
              Los libros de Richy
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 ml-1">Biblioteca Personal</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por título, autor o género..." 
                className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-rose-500/50 transition-all outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isAdmin && (
              <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 animate-in fade-in zoom-in duration-300">
                <button onClick={handleExport} className="p-3 bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition-all shadow-xl flex items-center gap-2" title="Guardar Copia">
                  <Download size={20} />
                </button>
                <label className="p-3 bg-slate-800 hover:bg-amber-500 text-amber-400 hover:text-black rounded-xl transition-all shadow-xl cursor-pointer" title="Cargar Copia">
                  <Upload size={20} />
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            )}

            <button 
              onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}
              className={`p-3.5 rounded-2xl transition-all ${isAdmin ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-500'}`}
              title={isAdmin ? "Cerrar Sesión" : "Acceso Administrador"}
            >
              {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
            </button>

            {isAdmin && (
              <button 
                onClick={() => { resetForm(); setIsFormOpen(true); }}
                className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Añadir
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-8 justify-center md:justify-start">
          {['Todos', ...Object.values(BookStatus)].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                statusFilter === s ? 'bg-white text-black border-white shadow-lg' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
          {filteredBooks.map(book => (
            <div key={book.id} onClick={() => setSelectedBook(book)} className="group cursor-pointer flex flex-col">
              <div className="aspect-[2/3] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 mb-3 group-hover:ring-4 ring-rose-600/40 transition-all duration-500">
                <img src={book.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1543004471-2401c3eaa991?q=80&w=1000&auto=format&fit=crop')} />
                <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase text-white z-10 ${getStatusColor(book.status)}`}>
                  {book.status}
                </div>
              </div>
              <h3 className="font-bold text-xs uppercase truncate text-slate-200 group-hover:text-rose-400">{book.title}</h3>
              <p className="text-[10px] text-slate-500 font-bold">{book.author}</p>
              {book.genres && book.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 overflow-hidden h-4">
                   {book.genres.slice(0, 2).map(g => (
                     <span key={g} className="text-[7px] text-slate-600 uppercase font-black tracking-tighter">#{g}</span>
                   ))}
                </div>
              )}
              <div className="mt-2"><StarRating rating={book.rating} size={10} /></div>
            </div>
          ))}
        </div>
      </main>

      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl max-h-[92vh]">
            <div className="md:w-1/2 h-72 md:h-auto overflow-hidden bg-black">
              <img src={selectedBook.coverUrl} className="w-full h-full object-cover md:object-contain" />
            </div>
            <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto relative text-left">
              <button onClick={() => setSelectedBook(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800 p-2.5 rounded-full transition-all"><X size={20} /></button>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-full text-white text-[9px] font-black uppercase ${getStatusColor(selectedBook.status)}`}>{selectedBook.status}</span>
                  <span className="text-slate-500 font-black text-xs">{selectedBook.year}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-50">{selectedBook.title}</h2>
                <p className="text-xl text-rose-500 font-black italic">de {selectedBook.author}</p>
                
                {selectedBook.genres && selectedBook.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedBook.genres.map(g => (
                      <span key={g} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <div className="py-6 border-y border-slate-800/50">
                  <p className="text-sm text-slate-300 leading-relaxed italic opacity-80">"{selectedBook.description}"</p>
                </div>
                <div className="flex justify-between items-center">
                  <StarRating rating={selectedBook.rating} size={28} />
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => { setFormData({...selectedBook}); setIsEditing(true); setIsFormOpen(true); }} className="p-3.5 bg-slate-800 text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={20} /></button>
                      <button onClick={() => {
                        if(deleteConfirmId === selectedBook.id) {
                          setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
                          setSelectedBook(null);
                        } else {
                          setDeleteConfirmId(selectedBook.id);
                          setTimeout(() => setDeleteConfirmId(null), 3000);
                        }
                      }} className={`p-3.5 rounded-2xl transition-all shadow-lg ${deleteConfirmId === selectedBook.id ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-500 hover:bg-rose-600 hover:text-white'}`}>
                        {deleteConfirmId === selectedBook.id ? <Check size={20} /> : <Trash2 size={20} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/99 backdrop-blur-3xl overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 max-w-5xl w-full shadow-2xl my-auto text-left">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase italic text-rose-500">{isEditing ? 'Editar Libro' : 'Nuevo Libro'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="bg-slate-800 p-3 rounded-full text-slate-500 hover:text-white transition-all"><X size={22} /></button>
            </div>
            
            <div className="flex flex-col gap-8">
              {/* FILA SUPERIOR: DATOS BÁSICOS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-6 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Título</label>
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    {!isEditing && <button onClick={handleAISuggest} disabled={loadingAI} className="px-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-30 flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20">
                      {loadingAI ? <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" /> : <Sparkles size={20} />}
                    </button>}
                  </div>
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Autor</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-500" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Año</label>
                  <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-500 text-center" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              {/* CUERPO DEL FORMULARIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-slate-800/50 pt-8">
                {/* LADO IZQUIERDO */}
                <div className="space-y-6">
                  <div className="flex gap-6 items-start">
                    <div className="w-48 aspect-[2/3] bg-slate-950 rounded-3xl border-2 border-dashed border-slate-800 overflow-hidden relative flex-shrink-0">
                      {formData.coverUrl ? (
                        <img 
                          src={formatDriveUrl(formData.coverUrl)} 
                          className="w-full h-full object-cover animate-in fade-in duration-500" 
                          onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1543004471-2401c3eaa991?q=80&w=1000&auto=format&fit=crop')}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 p-4 text-center">
                          <ImageIcon size={32} className="mb-2 opacity-20" />
                          <p className="text-[8px] font-black uppercase tracking-widest">Vista previa biblioteca</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 space-y-3">
                        <label className="text-[9px] font-black uppercase text-rose-500 tracking-widest block">URL Portada (Drive/Directo)</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-slate-400 focus:border-rose-500 outline-none" 
                          placeholder="Pega enlace aquí..." 
                          value={formData.coverUrl} 
                          onChange={e => setFormData({...formData, coverUrl: e.target.value})} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Sinopsis</label>
                        <textarea className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-medium h-32 resize-none outline-none focus:border-rose-500 italic" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* NUEVA SECCIÓN: ETIQUETAS */}
                  <div className="space-y-4 p-6 bg-slate-950/30 rounded-3xl border border-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TagIcon size={14} className="text-rose-500" />
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Géneros y Referencias</label>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.genres?.map(tag => (
                        <span key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-[9px] font-black uppercase text-slate-300 animate-in zoom-in duration-200">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Escribe y pulsa Enter para añadir etiqueta..." 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] font-bold uppercase outline-none focus:border-rose-500"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>
                </div>

                {/* LADO DERECHO */}
                <div className="space-y-6">
                  <div className="p-6 bg-slate-950/50 rounded-[2rem] border border-slate-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block">Herramientas de Diseño IA</label>
                      <Sparkles size={14} className="text-indigo-400" />
                    </div>
                    
                    <button 
                      onClick={async () => {
                        if(!formData.title) return alert('Pon un título para generar la imagen');
                        setLoadingImage(true);
                        setAiGeneratedImage(null);
                        try { 
                          const url = await generateBookCover(formData.title, formData.author || ''); 
                          setAiGeneratedImage(url);
                        } catch(e) {
                          alert('Error al generar imagen');
                        } finally { setLoadingImage(false); }
                      }} 
                      disabled={loadingImage} 
                      className="w-full py-4 bg-indigo-600/10 border border-indigo-600/30 rounded-2xl text-[10px] font-black uppercase text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      {loadingImage ? <div className="animate-spin h-3 w-3 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full" /> : <Eye size={16} />} Generar Propuesta Visual
                    </button>

                    {aiGeneratedImage && (
                      <div className="animate-in zoom-in duration-500 p-4 bg-slate-900 rounded-2xl border border-indigo-500/20 flex flex-col items-center gap-4">
                        <div className="w-full aspect-[2/3] max-w-[150px] bg-black rounded-xl overflow-hidden border border-indigo-500/30 shadow-2xl">
                          <img src={aiGeneratedImage} className="w-full h-full object-cover" />
                        </div>
                        <div className="w-full space-y-2">
                          <button 
                            onClick={handleDownloadAIImage}
                            className="w-full py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-400 transition-all shadow-lg"
                          >
                            <Download size={14} /> Descargar Portada IA
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Estado</label>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] font-black uppercase outline-none cursor-pointer appearance-none text-center" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as BookStatus})}>
                        {Object.values(BookStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Tu Valoración</label>
                      <div className="h-[58px] flex items-center justify-center bg-slate-950 rounded-2xl border border-slate-800">
                        <StarRating rating={formData.rating || 0} interactive onRatingChange={r => setFormData({...formData, rating: r})} size={24} />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSaveEntry} className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl transition-all active:scale-[0.97] mt-4 flex items-center justify-center gap-3">
                    <Save size={24} /> Guardar en Biblioteca
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] w-full max-w-xs border border-slate-800 shadow-2xl text-center">
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-amber-500">Acceso Privado</h3>
            <input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-8 outline-none focus:border-amber-500 text-center text-2xl font-black tracking-[0.5em]" placeholder="••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowLogin(false)} className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={handleLogin} className="flex-1 py-4 bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all">Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
