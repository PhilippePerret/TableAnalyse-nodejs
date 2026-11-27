// Thème « Classique » (par défaut) : titre centré en italique, court
// filet, deux colonnes centrées (édition musicale)
export default {
    id: 'classique'
  , layout: 'columns'
  , styles: {
        legend:      {fontFamily: "Georgia, 'Times New Roman', serif", color: '#000', textAlign: 'center', width: 'max-content', minWidth: '1200px'}
      , title1:      {fontSize: '56px', fontStyle: 'italic', marginBottom: '16px'}
      , rule:        {width: '300px', borderTop: '3px solid #222', margin: '0 auto 50px'}
      , items:       {display: 'inline-grid', gridTemplateColumns: 'auto auto', columnGap: '80px', rowGap: '30px', textAlign: 'left'}
      , item:        {display: 'flex', alignItems: 'center', gap: '36px'}
      , sign:        {width: '150px', flexShrink: '0', display: 'flex', justifyContent: 'center'}
      , description: {fontSize: '40px', whiteSpace: 'nowrap'}
    }
}
