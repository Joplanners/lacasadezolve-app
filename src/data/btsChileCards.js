/**
 * Datos de productos para la landing BTS Chile.
 * Estructura reutilizable: cualquier landing puede tener su propio archivo de datos
 * con la misma forma y alimentar los mismos componentes.
 */
export const btsChileCards = [
  {
    id: 'entradas',
    title: 'Entradas Conmemorativas',
    layout: 'dual',
    bgImage: '/images/bts/concert-bg.png',
    items: [
      {
        name: 'Entrada Conmemorativa con Datos',
        image: '/images/bts/EntradaConDatos.png',
        link: '/producto/3187dd88-f83d-4fa1-8a9d-9c51ec5660bd',
      },
      {
        name: 'Entrada Conmemorativa Gráfica',
        image: '/images/bts/EntradaGráfica1.png',
        link: '/producto/3187dd88-f83d-4fa1-8a9d-9c51ec5660bd',
      },
    ],
  },
  {
    id: 'planners',
    title: 'Planners',
    layout: 'dual',
    bgImage: '/images/bts/concert-bg.png',
    items: [
      {
        name: 'Planner Diario Trimestral BTS',
        image: '/images/bts/PlannerDiario.png',
        link: '/producto/cff76d64-2a1b-40f3-b2e4-a75f9f0c5bf9',
      },
      {
        name: 'Planner BTS',
        image: '/images/bts/PlannerBtsSticker.png',
        link: '/producto/453b9d10-d8d8-4777-8c69-7a89c9932056',
      },
    ],
  },
  {
    id: 'polera',
    title: 'Polera',
    layout: 'single',
    bgImage: '/images/bts/concert-bg.png',
    items: [
      {
        name: 'Polera BTS Arirang Tour',
        image: '/images/bts/Polera1.png',
        backImage: '/images/bts/Polera2.png',
        link: '/producto/e0c7d2c1-52f4-490b-93f1-9064b5d0afc8',
      },
    ],
  },
  {
    id: 'poleron',
    title: 'Polerón',
    layout: 'single',
    bgImage: '/images/bts/concert-bg.png',
    items: [
      {
        name: 'Polerón BTS Arirang Tour',
        image: '/images/bts/Poleron1.png',
        backImage: '/images/bts/Poleron2.png',
        link: '/tienda',
        comingSoon: true,
      },
    ],
  },
]
