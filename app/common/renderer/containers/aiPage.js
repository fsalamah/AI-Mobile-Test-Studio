import {connect} from 'react-redux';

//import * as SessionActions from '../actions/Session';
import AppiumAnalysisPanel from '../components/ai/AppiumAnalysisPanel.jsx';
import {withTranslation} from '../i18next';
import AIStudio from '../components/ai/AIStudio.jsx';

function mapStateToProps(state) {
  return state.session;
}

export default withTranslation(AIStudio, connect(mapStateToProps, SessionActions));
