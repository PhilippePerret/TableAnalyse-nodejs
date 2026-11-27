// Thème « Sobre » : filet au-dessus, titre en petites capitales espacées,
// deux colonnes
export default {
    id: 'sobre'
  , layout: 'columns'
  , styles: {
        legend:      {fontFamily: 'Helvetica, Arial, sans-serif', color: '#000', borderTop: '4px solid #222', paddingTop: '36px', width: 'max-content', minWidth: '1200px'}
      , title1:      {fontSize: '34px', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#444', marginBottom: '40px'}
      , items:       {display: 'grid', gridTemplateColumns: 'auto auto', columnGap: '110px', rowGap: '30px', justifyContent: 'start'}
      , item:        {display: 'flex', alignItems: 'center', gap: '36px'}
      , sign:        {width: '150px', flexShrink: '0', display: 'flex', justifyContent: 'center'}
      , description: {fontSize: '38px', whiteSpace: 'nowrap'}
    }
}
