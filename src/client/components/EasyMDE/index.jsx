/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    2/9/19 1:38 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { Fragment } from 'react'
import PropTypes from 'prop-types'

import Log from '../../logger'

import $ from 'jquery'
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import toMarkdown from 'tomarkdown'
import Easymde from 'easymde'

import 'inlineAttachment'
import 'inputInlineAttachment'
import 'cm4InlineAttachment'

class EasyMDE extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      value: '',
      loaded: false
    }
  }

  componentDidMount () {
    this.easymde = new Easymde({
      element: this.element,
      forceSync: true,
      minHeight: this.props.height,
      toolbar: EasyMDE.getMdeToolbarItems(),
      autoDownloadFontAwesome: false,
      status: false,
      spellChecker: false
    })

    this.easymde.codemirror.on('change', () => {
      this.onTextareaChanged(this.easymde.value())
    })

    if (this.easymde && this.props.allowImageUpload) {
      if (!this.props.inlineImageUploadUrl) return Log.error('Invalid inlineImageUploadUrl Prop.')

      const $el = $(this.element)
      const self = this
      if (!$el.hasClass('hasInlineUpload')) {
        $el.addClass('hasInlineUpload')
        window.inlineAttachment.editors.codemirror4.attach(this.easymde.codemirror, {
          onFileUploadResponse: function (xhr) {
            const result = JSON.parse(xhr.responseText)

            const filename = result[this.settings.jsonFieldName]

            if (result && filename) {
              let newValue
              if (typeof this.settings.urlText === 'function') {
                newValue = this.settings.urlText.call(this, filename, result)
              } else {
                newValue = this.settings.urlText.replace(this.filenameTag, filename)
              }

              const text = this.editor.getValue().replace(this.lastValue, newValue)
              this.editor.setValue(text)
              this.settings.onFileUploaded.call(this, filename)
            }
            return false
          },
          onFileUploadError: function (xhr) {
            const result = xhr.responseText
            const text = this.editor.getValue() + ' ' + result
            this.editor.setValue(text)
          },
          extraHeaders: self.props.inlineImageUploadHeaders,
          errorText: 'Error uploading file: ',
          uploadUrl: self.props.inlineImageUploadUrl,
          jsonFieldName: 'filename',
          urlText: '![Image]({filename})'
        })

        // Store upload configuration in textarea data attributes
        $(self.element).data('uploadUrl', self.props.inlineImageUploadUrl)
        $(self.element).data('uploadHeaders', self.props.inlineImageUploadHeaders)
        $(self.element).data('showAttachmentButton', self.props.showAttachmentButton)
        
        EasyMDE.attachFileDesc(self.element)
      }
    }
  }

  componentDidUpdate (prevProps) {
    if (this.easymde && this.easymde.value() !== this.state.value) {
      this.easymde.value(this.state.value)
    }
    
    // Re-attach file handlers if props changed
    if (prevProps.allowImageUpload !== this.props.allowImageUpload ||
        prevProps.inlineImageUploadUrl !== this.props.inlineImageUploadUrl ||
        prevProps.showAttachmentButton !== this.props.showAttachmentButton) {
      
      // Remove existing handlers
      const $el = $(this.element)
      $el.removeClass('hasInlineUpload')
      $el.siblings('.editor-statusbar').find('.attachFileDesc').remove()
      
      // Re-attach if needed
      if (this.easymde && this.props.allowImageUpload) {
        if (!this.props.inlineImageUploadUrl) return Log.error('Invalid inlineImageUploadUrl Prop.')

        if (!$el.hasClass('hasInlineUpload')) {
          $el.addClass('hasInlineUpload')
          window.inlineAttachment.editors.codemirror4.attach(this.easymde.codemirror, {
            onFileUploadResponse: function (xhr) {
              const result = JSON.parse(xhr.responseText)

              const filename = result[this.settings.jsonFieldName]

              if (result && filename) {
                let newValue
                if (typeof this.settings.urlText === 'function') {
                  newValue = this.settings.urlText.call(this, filename, result)
                } else {
                  newValue = this.settings.urlText.replace(this.filenameTag, filename)
                }

                const text = this.editor.getValue().replace(this.lastValue, newValue)
                this.editor.setValue(text)
                this.settings.onFileUploaded.call(this, filename)
              }
              return false
            },
            onFileUploadError: function (xhr) {
              const result = xhr.responseText
              const text = this.editor.getValue() + ' ' + result
              this.editor.setValue(text)
            },
            extraHeaders: this.props.inlineImageUploadHeaders,
            errorText: 'Error uploading file: ',
            uploadUrl: this.props.inlineImageUploadUrl,
            jsonFieldName: 'filename',
            urlText: '![Image]({filename})'
          })

          // Store upload configuration in textarea data attributes
          $(this.element).data('uploadUrl', this.props.inlineImageUploadUrl)
          $(this.element).data('uploadHeaders', this.props.inlineImageUploadHeaders)
          $(this.element).data('showAttachmentButton', this.props.showAttachmentButton)
          
          EasyMDE.attachFileDesc(this.element)
        }
      }
    }
  }

  componentWillUnmount () {
    if (this.easymde) {
      this.easymde.codemirror.off('change')
      this.easymde = null
    }
    
    // Clean up file input handlers
    const $el = $(this.element)
    $el.siblings('.editor-statusbar').find('.attachFileDesc').remove()
    $el.removeClass('hasInlineUpload')
  }

  static getDerivedStateFromProps (nextProps, state) {
    if (typeof nextProps.defaultValue !== 'undefined') {
      if (!state.loaded && nextProps.defaultValue !== state.value)
        return { value: toMarkdown(nextProps.defaultValue).replace(/\\n/gi, '\n'), loaded: true }
    }

    return null
  }

  static attachFileDesc (textarea) {
    const $el = $(textarea)
    const attachFileDiv = $('<div></div>')
    
    // Create file input element
    const fileInput = $('<input type="file" accept="image/*" style="display: none;" />')
    
    // Create attachment button
    const attachButton = $('<button type="button" class="attach-button" style="background: #007cba; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 12px;">')
      .html('<i class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">attach_file</i>Attach Files')
    
    // Create description text
    const descriptionText = $('<span style="font-size: 12px; color: #666;">Attach images and PDFs by clicking the button, dragging & dropping, or pasting from clipboard.</span>')
    
    attachFileDiv
      .addClass('attachFileDesc')
      .append(fileInput)
    
    // Check if attachment button should be shown
    const showAttachmentButton = $el.data('showAttachmentButton') !== false
    if (showAttachmentButton) {
      attachFileDiv.append(attachButton)
    }
    
    attachFileDiv.append(descriptionText)
    
    $el.siblings('.CodeMirror').addClass('hasFileDesc')
    $el
      .siblings('.editor-statusbar')
      .addClass('hasFileDesc')
      .prepend(attachFileDiv)
    
    // Handle button click to trigger file input
    attachButton.on('click', function() {
      fileInput.click()
    })
    
    // Handle file selection
    fileInput.on('change', function(e) {
      const files = e.target.files
      if (files && files.length > 0) {
        EasyMDE.handleFileSelection(files, textarea)
        // Clear the file input after selection to allow re-uploading the same file
        $(this).val('')
      }
    })
  }
  
  static handleFileSelection (files, textarea) {
    const $el = $(textarea)
    
    Array.from(files).forEach(file => {
      // Check if file is image or PDF
      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf'
      
      if (!isImage && !isPDF) {
        console.warn('Unsupported file type:', file.type)
        return
      }
      
      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      
      // Get upload URL from the component instance
      const uploadUrl = $el.data('uploadUrl') || '/api/upload'
      const headers = $el.data('uploadHeaders') || {}
      
      // Upload file
      $.ajax({
        url: uploadUrl,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        headers: headers,
        success: function(response) {
          const filename = response.filename || response.url || file.name
          let markdownText
          
          if (isImage) {
            markdownText = `![${file.name}](${filename})`
          } else if (isPDF) {
            markdownText = `[${file.name}](${filename})`
          }
          
          // Insert markdown text at cursor position
          const codeMirrorElement = $el.siblings('.CodeMirror')[0]
          if (codeMirrorElement && codeMirrorElement.CodeMirror) {
            const editor = codeMirrorElement.CodeMirror
            const cursor = editor.getCursor()
            editor.replaceRange(markdownText + '\n', cursor)
            
            // Trigger change event to update React state
            $el.trigger('change')
          } else {
            // Fallback: append to the end of the textarea
            const currentValue = $el.val()
            $el.val(currentValue + '\n' + markdownText)
            $el.trigger('change')
          }
        },
        error: function(xhr, status, error) {
          console.error('File upload failed:', error)
          alert('Failed to upload file: ' + error)
        }
      })
    })
  }

  onTextareaChanged (value) {
    this.setState({
      value
    })

    if (this.props.onChange) this.props.onChange(value)
  }

  getEditorText () {
    return this.state.value
  }

  setEditorText (value) {
    this.setState({
      value: toMarkdown(value)
    })
  }

  static getMdeToolbarItems () {
    return [
      {
        name: 'bold',
        action: Easymde.toggleBold,
        className: 'material-icons mi-bold no-ajaxy',
        title: 'Bold'
      },
      {
        name: 'italic',
        action: Easymde.toggleItalic,
        className: 'material-icons mi-italic no-ajaxy',
        title: 'Italic'
      },
      {
        name: 'Title',
        action: Easymde.toggleHeadingSmaller,
        className: 'material-icons mi-title no-ajaxy',
        title: 'Title'
      },
      '|',
      {
        name: 'Code',
        action: Easymde.toggleCodeBlock,
        className: 'material-icons mi-code no-ajaxy',
        title: 'Code'
      },
      {
        name: 'Quote',
        action: Easymde.toggleBlockquote,
        className: 'material-icons mi-quote no-ajaxy',
        title: 'Quote'
      },
      {
        name: 'Generic List',
        action: Easymde.toggleUnorderedList,
        className: 'material-icons mi-list no-ajaxy',
        title: 'Generic List'
      },
      {
        name: 'Numbered List',
        action: Easymde.toggleOrderedList,
        className: 'material-icons mi-numlist no-ajaxy',
        title: 'Numbered List'
      },
      '|',
      {
        name: 'Create Link',
        action: Easymde.drawLink,
        className: 'material-icons mi-link no-ajaxy',
        title: 'Create Link'
      },
      '|',
      {
        name: 'Toggle Preview',
        action: Easymde.togglePreview,
        className: 'material-icons mi-preview no-disable no-mobile no-ajaxy',
        title: 'Toggle Preview'
      }
    ]
  }

  render () {
    setTimeout(() => {
      this.easymde.codemirror.refresh()
    }, 250)
    return (
      <Fragment>
        <textarea ref={i => (this.element = i)} value={this.state.value} onChange={e => this.onTextareaChanged(e)} />
        {this.props.showStatusBar && <div className='editor-statusbar uk-float-left uk-width-1-1' />}
      </Fragment>
    )
  }
}

EasyMDE.propTypes = {
  height: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  defaultValue: PropTypes.string,
  allowImageUpload: PropTypes.bool,
  inlineImageUploadUrl: PropTypes.string,
  inlineImageUploadHeaders: PropTypes.object,
  showStatusBar: PropTypes.bool.isRequired,
  showAttachmentButton: PropTypes.bool
}

EasyMDE.defaultProps = {
  height: '150px',
  allowImageUpload: false,
  showStatusBar: true,
  showAttachmentButton: true
}

export default EasyMDE
