function manualcontrolPanel() {
  $('#cd-layout').show()
  $('.window-content > nav[data-role="ribbonmenu"]:first').addClass('cd-ribbon-hidden')
  $('#manualControlPanel').hide()
  $('#grblPanel').hide()
  $('#fluidncPanel').hide()
  $('#updatePanel').hide()
  $('#troubleshootingPanel').hide()
}

function grblPanel() {
  grblPopulate();
  $('#cd-layout').hide()
  $('.window-content > nav[data-role="ribbonmenu"]:first').removeClass('cd-ribbon-hidden')
  $('#manualControlPanel').hide()
  $('#grblPanel').show()
  $('#fluidncPanel').hide()
  $('#updatePanel').hide()
  $('#troubleshootingPanel').hide()
}

function fluidncPanel() {
  $('#cd-layout').hide()
  $('.window-content > nav[data-role="ribbonmenu"]:first').removeClass('cd-ribbon-hidden')
  $('#manualControlPanel').hide()
  $('#grblPanel').hide()
  $('#fluidncPanel').show()
  $('#updatePanel').hide()
  $('#troubleshootingPanel').hide()
}

function updatePanel() {
  $('#cd-layout').hide()
  $('.window-content > nav[data-role="ribbonmenu"]:first').removeClass('cd-ribbon-hidden')
  $('#manualControlPanel').hide()
  $('#grblPanel').hide()
  $('#fluidncPanel').hide()
  $('#updatePanel').show()
  $('#troubleshootingPanel').hide()
}

function troubleshootingPanel() {
  $('#cd-layout').hide()
  $('.window-content > nav[data-role="ribbonmenu"]:first').removeClass('cd-ribbon-hidden')
  $('#manualControlPanel').hide()
  $('#grblPanel').hide()
  $('#fluidncPanel').hide()
  $('#updatePanel').hide()
  $('#troubleshootingPanel').show()
}
