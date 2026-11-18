import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Copy,
  Lightbulb,
  Play,
  Printer,
  RefreshCw,
  Save,
  Usb,
  Wifi,
  Wrench,
  XCircle,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ConfigAgente } from '@/global.d';

// ── Config inyectada por el agente ──────────────────────────────────────────
const CFG: ConfigAgente = window.__AGENTE_POS__ ?? { token: '', puerto: '9191' };
const T = CFG.token;

// ── Tipos ────────────────────────────────────────────────────────────────────
interface EstadoAgente {
  ok: boolean;
  version: string;
  puerto: number;
  impresora: string;
  impresoraResuelta: string;
  usaPredeterminada: boolean;
  spoolerCorriendo: boolean;
  spoolerEstado: string;
  autoSanar: boolean;
  baseDir: string;
  tipografia: { configurada: boolean; actualizada?: string };
  ultimoError?: string;
  ultimoErrorHora?: string;
}

interface InfoImpresora {
  nombre: string;
  puerto: string;
  driver: string;
  trabajos: number;
  estado: string;
  offline: boolean;
  papelAgotado: boolean;
  atasco: boolean;
  pausada: boolean;
  predeterminada: boolean;
  configurada: boolean;
}

interface Check {
  id: string;
  titulo: string;
  estado: 'ok' | 'error' | 'aviso';
  detalle: string;
  sugerencia: string | null;
}

interface Doc {
  fuente: string;
  ancho: number;
  alto: number;
  interletrado: number;
  interlineado: number;
  espacioItems: number;
}

const DOC_DEFAULT = (comanda: boolean): Doc => ({
  fuente: 'A',
  ancho: 1,
  alto: 1,
  interletrado: 1,
  interlineado: 8,
  espacioItems: comanda ? 1 : 0,
});

// ── API ──────────────────────────────────────────────────────────────────────
async function api(ruta: string, cuerpo?: string, tipo = 'application/json') {
  const opciones: RequestInit = {
    method: cuerpo ? 'POST' : 'GET',
    headers: { 'X-Pos-Token': T } as Record<string, string>,
  };
  if (cuerpo) {
    opciones.body = cuerpo;
    (opciones.headers as Record<string, string>)['Content-Type'] = tipo;
  }
  const res = await fetch(ruta, opciones);
  try {
    return await res.json();
  } catch {
    return { ok: false, error: 'Respuesta invalida del agente' };
  }
}

function esc(t: string | null | undefined): string {
  return (t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [estado, setEstado] = useState<EstadoAgente | null>(null);
  const [impresoras, setImpresoras] = useState<InfoImpresora[]>([]);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [comanda, setComanda] = useState<Doc>(DOC_DEFAULT(true));
  const [ticket, setTicket] = useState<Doc>(DOC_DEFAULT(false));
  const [tipografiaFecha, setTipografiaFecha] = useState('');
  const [autoSanar, setAutoSanar] = useState(true);

  const refrescar = () => {
    cargarEstado();
    cargarImpresoras();
    cargarTipografia();
  };

  useEffect(refrescar, []);

  async function cargarEstado() {
    const d = await api('/api/estado');
    if (!d.ok) return;
    setEstado(d);
    setAutoSanar(!!d.autoSanar);
  }

  async function cargarImpresoras() {
    const d = await api('/api/impresoras');
    if (d.ok) setImpresoras(d.impresoras ?? []);
  }

  async function cargarTipografia() {
    const d = await api('/config');
    if (d.configurada && d.tipografia) {
      if (d.tipografia.comanda) setComanda(d.tipografia.comanda);
      if (d.tipografia.ticket) setTicket(d.tipografia.ticket);
      setTipografiaFecha(d.actualizada ?? '');
    } else {
      setTipografiaFecha('');
    }
  }

  async function imprimirPrueba() {
    toast('Enviando prueba...');
    const d = await api('/api/prueba', '{}');
    if (d.ok) {
      toast.success('Prueba enviada a la impresora');
      refrescar();
    } else {
      toast.error(d.error ?? 'No se pudo imprimir');
    }
  }

  async function sanar() {
    toast('Aceptá el permiso de administrador que aparece en pantalla...');
    const d = await api('/api/sanar', '{}');
    if (d.ok) toast.success('Reparando servicio de impresión. Probá imprimir en unos segundos.');
    else toast.error(d.error ?? 'No se pudo sanar');
  }

  async function elegirImpresora(nombre: string) {
    toast(`Configurando ${nombre}...`);
    const d = await api('/api/impresora', JSON.stringify({ nombre }));
    if (d.ok) {
      toast.success(`El agente imprime en: ${nombre}`);
      refrescar();
    } else {
      toast.error(d.error ?? 'Error');
    }
  }

  async function definirPredeterminada(nombre: string) {
    toast('Definiendo predeterminada...');
    const d = await api('/api/predeterminada', JSON.stringify({ nombre }));
    if (d.ok) {
      toast.success(`${nombre} es la predeterminada de Windows`);
      refrescar();
    } else {
      toast.error(d.error ?? 'Error');
    }
  }

  async function enviarTipografia(): Promise<boolean> {
    const d = await api(
      '/config',
      JSON.stringify({ tipografia: { comanda, ticket } }),
    );
    if (d.ok) {
      toast.success('Tipografía guardada');
      cargarTipografia();
      return true;
    }
    toast.error(d.error ?? 'No se pudo guardar');
    return false;
  }

  async function guardarEImprimir() {
    if (await enviarTipografia()) {
      toast('Imprimiendo prueba...');
      await api('/api/prueba', '{}');
    }
  }

  async function cargarDiagnostico() {
    setChecks(null);
    const d = await api('/diagnostico');
    setChecks(d.checks ?? []);
  }

  async function guardarAjustes() {
    const d = await api('/api/ajustes', JSON.stringify({ autoSanar }));
    if (d.ok) toast.success('Ajustes guardados');
    else toast.error(d.error ?? 'Error');
  }

  async function copiarToken() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(T);
      toast.success('Token copiado');
    } else {
      toast.error('Tu navegador no permite copiar: copialo a mano');
    }
  }

  const snippets = {
    curl: `curl -X POST http://127.0.0.1:${CFG.puerto}/print \\\n  -H "X-Pos-Token: ${T}" \\\n  --data-binary @ticket.bin`,
    node: `import fs from "fs";\n\nawait fetch("http://127.0.0.1:${CFG.puerto}/print", {\n  method: "POST",\n  headers: {\n    "X-Pos-Token": "${T}",\n    "Content-Type": "application/octet-stream"\n  },\n  body: fs.readFileSync("ticket.bin")\n});`,
    python: `import requests\n\nrequests.post(\n    "http://127.0.0.1:${CFG.puerto}/print",\n    headers={"X-Pos-Token": "${T}"},\n    data=open("ticket.bin", "rb").read(),\n)`,
  };

  const sinToken = !T;

  return (
    <div className="min-h-screen">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              P
            </span>
            Agente POS
            {estado && (
              <Badge variant="secondary" className="font-mono text-[11px] font-normal">
                v{estado.version}
              </Badge>
            )}
          </div>
          <nav className="flex flex-wrap gap-1 text-sm">
            {[
              ['#estado', 'Estado'],
              ['#impresoras', 'Impresoras'],
              ['#tipografia', 'Tipografía'],
              ['#diagnostico', 'Diagnóstico'],
              ['#api', 'API universal'],
              ['#ajustes', 'Ajustes'],
            ].map(([href, texto]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {texto}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-7 px-4 py-6 pb-20">
        {sinToken && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
            Esta página se abrió sin el token del agente. Cerrala y abrila de nuevo
            desde el ícono de la bandeja (clic o doble clic).
          </div>
        )}

        {/* ── Estado ──────────────────────────────────────────────────── */}
        <section id="estado" className="scroll-mt-20 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Estado
          </h2>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {estado?.impresoraResuelta || 'Sin impresora'}
                  </CardTitle>
                  <CardDescription>
                    {estado?.usaPredeterminada
                      ? 'Usando la predeterminada de Windows. Podés fijar una en Impresoras.'
                      : `Configurada en el agente: ${estado?.impresora ?? ''}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={estado?.impresoraResuelta ? 'success' : 'danger'}>
                    {estado?.impresoraResuelta ? 'Impresora lista' : 'Sin impresora'}
                  </Badge>
                  <Badge variant={estado?.spoolerCorriendo ? 'success' : 'danger'}>
                    Spooler: {estado?.spoolerEstado ?? '...'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={imprimirPrueba}>
                  <Printer /> Imprimir prueba
                </Button>
                <Button variant="secondary" onClick={sanar}>
                  <Wrench /> Sanar impresora
                </Button>
                <Button variant="outline" onClick={refrescar}>
                  <RefreshCw /> Refrescar
                </Button>
              </div>
              {estado?.ultimoError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                  Último error ({esc(estado.ultimoErrorHora)}): {esc(estado.ultimoError)}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Impresoras ──────────────────────────────────────────────── */}
        <section id="impresoras" className="scroll-mt-20 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Impresoras
            </h2>
            <Button variant="outline" size="sm" onClick={cargarImpresoras}>
              <RefreshCw /> Refrescar
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardDescription>
                Elegí la comandera que usa el agente. También podés definirla como
                predeterminada de Windows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {impresoras.length === 0 && (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              )}
              {impresoras.map((p) => (
                <div
                  key={p.nombre}
                  className="flex flex-wrap items-center gap-3 rounded-lg border bg-secondary/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {p.nombre}
                      {p.configurada && <Badge variant="success">En uso</Badge>}
                      {p.predeterminada && <Badge variant="secondary">Predeterminada</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Puerto {esc(p.puerto) || '?'} · Driver {esc(p.driver) || '?'} ·{' '}
                      {esc(p.estado)} · {p.trabajos} en cola
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={p.configurada ? 'secondary' : 'default'}
                    onClick={() => elegirImpresora(p.nombre)}
                  >
                    {p.configurada ? 'En uso' : 'Usar en el agente'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => definirPredeterminada(p.nombre)}
                  >
                    {p.predeterminada ? 'Predeterminada' : 'Predeterminada de Windows'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* ── Tipografía ──────────────────────────────────────────────── */}
        <section id="tipografia" className="scroll-mt-20 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Tipografía
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <EditorDoc titulo="Comanda" doc={comanda} setDoc={setComanda} />
            <EditorDoc titulo="Ticket" doc={ticket} setDoc={setTicket} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={guardarEImprimir}>
              <Save /> Guardar e imprimir
            </Button>
            <Button variant="secondary" onClick={enviarTipografia}>
              Solo guardar
            </Button>
            <span className="text-xs text-muted-foreground">
              {tipografiaFecha || 'Valores por defecto (todavía no se guardó ninguna).'}
            </span>
          </div>
        </section>

        {/* ── Diagnóstico ─────────────────────────────────────────────── */}
        <section id="diagnostico" className="scroll-mt-20 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Diagnóstico
            </h2>
            <Button onClick={cargarDiagnostico}>
              <Play /> Ejecutar
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardDescription>
                Chequea servicio de impresión, impresora, cola, disco y configuración.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {checks === null && (
                <p className="text-sm text-muted-foreground">
                  Tocá "Ejecutar" para correr los chequeos.
                </p>
              )}
              {checks?.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border bg-secondary/40 p-3"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor:
                      c.estado === 'ok'
                        ? 'rgb(52 211 153)'
                        : c.estado === 'error'
                          ? 'rgb(248 113 113)'
                          : 'rgb(251 191 36)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {c.titulo}
                    <Badge variant={c.estado === 'ok' ? 'success' : c.estado === 'error' ? 'danger' : 'warning'}>
                      {c.estado === 'ok' ? 'OK' : c.estado === 'error' ? 'Error' : 'Aviso'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{esc(c.detalle)}</div>
                  {c.sugerencia && (
                    <div className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      {esc(c.sugerencia)}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* ── API universal ───────────────────────────────────────────── */}
        <section id="api" className="scroll-mt-20 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            API universal
          </h2>
          <Card>
            <CardHeader>
              <CardDescription>
                Cualquier sistema POS puede imprimir apuntando a{' '}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                  http://127.0.0.1:{CFG.puerto}/print
                </code>{' '}
                con bytes crudos (ESC/POS). El agente elige impresora, repara el
                servicio si está caído y nunca abre diálogos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="token">Token</Label>
                  <Input id="token" readOnly value={T} className="font-mono text-xs" />
                </div>
                <Button variant="outline" onClick={copiarToken}>
                  <Copy /> Copiar
                </Button>
              </div>
              <Separator />
              <BloqueSnippet titulo="curl" codigo={snippets.curl} />
              <BloqueSnippet titulo="Node.js" codigo={snippets.node} />
              <BloqueSnippet titulo="Python" codigo={snippets.python} />
            </CardContent>
          </Card>
        </section>

        {/* ── Ajustes ─────────────────────────────────────────────────── */}
        <section id="ajustes" className="scroll-mt-20 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Ajustes
          </h2>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="max-w-xl space-y-1">
                <Label htmlFor="autoSanar" className="text-base">
                  Auto-sanado
                </Label>
                <p className="text-sm text-muted-foreground">
                  Si una impresión falla porque el servicio de Windows está caído, el
                  agente pide permiso de administrador y lo repara solo (máximo un
                  intento cada 3 minutos).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="autoSanar" checked={autoSanar} onCheckedChange={setAutoSanar} />
                <Button variant="secondary" size="sm" onClick={guardarAjustes}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Puerto 127.0.0.1:{estado?.puerto ?? CFG.puerto}</Badge>
            <Badge variant="outline">Inicia con Windows: desde la bandeja</Badge>
          </div>
          {estado && (
            <p className="text-xs text-muted-foreground">
              Carpeta: {esc(estado.baseDir)} · Log: agent.log
            </p>
          )}
        </section>

        {/* ── Próximamente ────────────────────────────────────────────── */}
        <section id="futuro" className="scroll-mt-20 space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Próximamente
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wifi className="h-4 w-4 text-primary" /> Impresoras de red (LAN)
                  <Badge>v2.1</Badge>
                </CardTitle>
                <CardDescription>
                  Descubrimiento de comanderas en la red (puerto 9100 / mDNS) y envío
                  directo TCP sin instalar nada en Windows.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Usb className="h-4 w-4 text-primary" /> USB directo (WinUSB)
                  <Badge>v2.2</Badge>
                </CardTitle>
                <CardDescription>
                  Impresión por USB sin driver, al estilo Zadig: si el driver del
                  local está roto, el agente lo bypasea.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="pb-10 text-center text-xs text-muted-foreground">
        Agente POS{estado ? ` v${estado.version}` : ''} · Instalado en {esc(estado?.baseDir ?? '')}
      </footer>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────
function EditorDoc({
  titulo,
  doc,
  setDoc,
}: {
  titulo: string;
  doc: Doc;
  setDoc: (d: Doc) => void;
}) {
  const campo = (clave: keyof Doc, etiqueta: string, min: number, max: number) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{etiqueta}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={doc[clave]}
        onChange={(e) =>
          setDoc({ ...doc, [clave]: parseInt(e.target.value, 10) || min })
        }
        className="w-20"
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Fuente</Label>
          <Select value={doc.fuente} onValueChange={(v) => setDoc({ ...doc, fuente: v })}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A (12 columnas)</SelectItem>
              <SelectItem value="B">B (18 columnas, chica)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-3">
          {campo('ancho', 'Ancho', 1, 4)}
          {campo('alto', 'Alto', 1, 4)}
          {campo('interletrado', 'Interletrado', 0, 8)}
          {campo('interlineado', 'Interlineado', 0, 60)}
          {campo('espacioItems', 'Espacio items', 0, 3)}
        </div>
      </CardContent>
    </Card>
  );
}

function BloqueSnippet({ titulo, codigo }: { titulo: string; codigo: string }) {
  const copiar = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(codigo);
      toast.success(`Snippet de ${titulo} copiado`);
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{titulo}</Label>
        <Button variant="ghost" size="sm" onClick={copiar}>
          <Copy /> Copiar
        </Button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-background p-3 font-mono text-xs text-muted-foreground">
        {codigo}
      </pre>
    </div>
  );
}
