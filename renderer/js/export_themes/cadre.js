// Thème « Cadres » : nomenclature encadrée, titre séparé par un trait,
// deux colonnes
export default {
    id: 'cadre'
  , layout: 'columns'
  , styles: {
        legend:      {fontFamily: 'Helvetica, Arial, sans-serif', color: '#000', border: '5px solid #222', borderRadius: '20px', width: 'max-content', minWidth: '1200px'}
      , title1:      {fontSize: '38px', fontWeight: 'bold', padding: '20px 40px', borderBottom: '3px solid #222', letterSpacing: '0.03em'}
      , items:       {display: 'grid', gridTemplateColumns: 'auto auto', padding: '36px 40px', columnGap: '70px', rowGap: '26px', justifyContent: 'start'}
      , item:        {display: 'flex', alignItems: 'center', gap: '30px'}
      , sign:        {width: '150px', flexShrink: '0', display: 'flex', justifyContent: 'center'}
      , description: {fontSize: '36px', whiteSpace: 'nowrap'}
    }
}
