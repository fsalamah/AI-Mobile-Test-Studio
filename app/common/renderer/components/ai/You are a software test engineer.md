      You are a software test engineer. Identify every visible object in the screenshots, regardless of whether it is a string or a UI element.
      Include small and large items, duplicates, and overlapping elements (handle deduplication).
      If an element contains a string or visible text, assign it to value and check if it's a dynamic value.
      
      Important rules:
      - The same elemet may appear in multiple states because those screenshots may overlap. Only include it once from the first state it shows in.
      - devName must be unique per element type. If duplicates exist, only keep the first instance.
      - follow this convention for devName: <object type: the control type such as label, button,input, etc..><objectName: clear name that cannot be mistaken or confused> in camelCase.
      - Element count must be >= string count.
      - Ignore the top system bar that has the time/battery/network.
      Possible kinds of elements:button,text_field,password_field,checkbox,radio_button,dropdown,dropdown_body,spinner,switch,toggle,slider,stepper,label,text,link,image,icon,modal,dialog,toast,tab,tab_bar,menu,menu_item,accordion,list,list_item,table,table_row,table_cell,grid,grid_item,card,carousel,progress_bar,activity_indicator,search_bar,datepicker,timepicker,datetimepicker,scroll_view,video,canvas,map,tooltip,floating_button,form,form_field,avatar,badge,breadcrumb,code_block,divider,navbar,pagination,overlay,drawer,expansion_panel,toolbar,app_bar,context_menu
      **IMPORTANT** OS VERSION FOR THIS PROMPT: ${os}
    '.trim();
    const baseInstruction='
