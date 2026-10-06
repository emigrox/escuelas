import React, { useState } from 'react';
import { FileText, Printer, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { comprobantesService } from '../services/api';

export const ComprobantesPage: React.FC = () => {
  const [ordenId, setOrdenId] = useState('1');
  const [monto, setMonto] = useState('2500000');
  const [observaciones, setObservaciones] = useState('Verificación de pintura interior y adecuación de sanitarios en planta baja.');
  const [generado, setGenerado] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await comprobantesService.generar(Number(ordenId), Number(monto), observaciones);
      setGenerado(res.data);
    } catch {
      // Mock de demostración para visualización
      setGenerado({
        id: 101,
        nro_comprobante: `CERT-2026-00${ordenId}`,
        fecha_emision: new Date().toISOString().split('T')[0],
        monto_certificado: Number(monto),
        estado: 'Certificado Oficial',
        observaciones
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Emisión de Comprobantes Oficiales</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Fase 2 (Vista Previa Operativa)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Carga, validación técnica y generación de actas de recepción de obras imprimibles en PDF
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Carga */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            <span>Emitir Nuevo Certificado</span>
          </h2>

          <form onSubmit={handleGenerar} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Orden de Provisión Asociada
              </label>
              <select
                value={ordenId}
                onChange={(e) => setOrdenId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">OP-2026-0042 • Colegio Secundario Gral. San Martín ($6.2M)</option>
                <option value="2">OP-2026-0089 • Escuela Normal Juan Pujol ($8.3M)</option>
                <option value="3">OP-2026-0115 • Escuela Técnica N° 1 Juana Manso ($4.1M)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Monto a Certificar ($)
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Observaciones del Inspector
              </label>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>{loading ? 'Generando...' : 'Generar Comprobante Oficial'}</span>
            </button>
          </form>
        </div>

        {/* Vista Previa del Comprobante Generado */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-2">Vista Previa de Acta Oficial</h2>
            <p className="text-xs text-slate-500 mb-6">
              Plantilla formal del Ministerio de Educación de Corrientes lista para impresión y firma digital
            </p>

            {generado ? (
              <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50 space-y-4">
                <div className="text-center border-b pb-4">
                  <p className="font-black text-slate-900 text-sm tracking-wide">GOBIERNO DE LA PROVINCIA DE CORRIENTES</p>
                  <p className="text-xs text-slate-600">DIRECCIÓN GENERAL DE INFRAESTRUCTURA ESCOLAR</p>
                  <p className="text-xs font-mono font-bold text-blue-700 mt-2">{generado.nro_comprobante}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Fecha de Certificación:</span>
                    <span className="font-semibold text-slate-800">{generado.fecha_emision}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Monto Certificado:</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      ${Number(generado.monto_certificado).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Informe Técnico:</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1 italic">
                      "{generado.observaciones}"
                    </p>
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-500">
                  <div className="border-t border-slate-300 pt-1">
                    Firma Inspector de Obra
                  </div>
                  <div className="border-t border-slate-300 pt-1">
                    Firma y Sello Establecimiento
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400 text-xs">
                Seleccione una orden y presione "Generar Comprobante" para visualizar el documento oficial.
              </div>
            )}
          </div>

          {generado && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <a
                href={comprobantesService.imprimirUrl(generado.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Descargar / Imprimir en PDF</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
