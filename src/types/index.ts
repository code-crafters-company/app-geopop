export interface LoginResult {
  usuarioId: string;
  accessToken: string;
  nomeCompleto: string;
  email: string;
  nivelAcesso: number;
  tenantId?: string | null;
  tenantNome?: string | null;
  corPrimaria?: string | null;
  corSecundaria?: string | null;
  logoUrl?: string | null;
  subdominio?: string | null;
  isAppUser: boolean;
}

export interface Veiculo {
  id: string;
  placa: string;
  placaExtra?: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  uf?: string;
  cidade?: string;
  endereco?: string;
  icone?: string;
  favorecidoNome: string;
  latitude?: number;
  longitude?: number;
  ultimaVelocidade?: number;
  ignicao: boolean;
  bateriaPercentual?: number;
  ultimaPosicao?: string;
  limiteVelocidadeKmh?: number;
  status: number;
}

export function isVeiculoOnline(veiculo: Veiculo) {
  if (!veiculo.ultimaPosicao) return false;
  return Date.now() - new Date(veiculo.ultimaPosicao).getTime() < 10 * 60 * 1000;
}

export function hasVeiculoGps(veiculo: Veiculo) {
  return veiculo.latitude != null && veiculo.longitude != null;
}

export function getVeiculoLocalizacao(veiculo: Veiculo) {
  return veiculo.endereco || [veiculo.cidade, veiculo.uf].filter(Boolean).join(' - ') || 'Localização não informada';
}

export interface CercaVirtual {
  id: string;
  veiculoId: string;
  veiculoPlaca: string;
  nome: string;
  tipo: 0 | 1; // 0=Circulo, 1=Poligono
  latitude?: number;
  longitude?: number;
  raio?: number;
  pontos?: string;
  alertarEntrada: boolean;
  alertarSaida: boolean;
  status: number;
}

export interface HistoricoPosicao {
  id: string;
  veiculoId: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  ignicao: boolean;
  bateriaPercentual?: number;
  dataHora: string;
}

export interface Evento {
  id: string;
  veiculoId: string;
  veiculoPlaca: string;
  tipo: number;
  descricao: string;
  latitude?: number;
  longitude?: number;
  velocidade?: number;
  dataHora: string;
}

export interface Notificacao {
  id: string;
  veiculoId?: string;
  veiculoPlaca?: string;
  titulo: string;
  mensagem: string;
  tipo: number;
  lida: boolean;
  dataCriacao: string;
}

export interface PaginatedResult<T> {
  result: T[];
  pagination: {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    totalElements: number;
  };
}

export interface ApiResponse<T> {
  result?: T;
  isValid: boolean;
  errors: string[];
}

export const TipoEvento = {
  0: 'Ignição Ligada',
  1: 'Ignição Desligada',
  2: 'Velocidade Excedida',
  3: 'Entrada em Cerca',
  4: 'Saída de Cerca',
} as const;

export const TipoCercaVirtual = {
  0: 'Círculo',
  1: 'Polígono',
} as const;
