// Thème « Filets » : tableau sans entête, un filet gris entre les lignes
export default {
    id: 'filets'
  , layout: 'table'
  , header: false
  , styles: {
        legend:      {fontFamily: "Georgia, 'Times New Roman', serif", color: '#000', width: '1400px'}
      , title1:      {fontSize: '46px', fontWeight: 'bold', marginBottom: '26px'}
      , table:       {borderCollapse: 'collapse', width: '100%'}
      , td:          {padding: '20px 26px', borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc', verticalAlign: 'middle'}
      , sign:        {width: '180px', textAlign: 'center'}
      , description: {fontSize: '38px'}
    }
}
